---
author: "Javi Vela"
title: "Azure Key Vault Provider for Secrets Store CSI Driver, leyendo y utilizando información de un Azure Key Vault desde AKS"
date: "2022-12-13"
tags: ["Kubernetes", "aks", "k8s","secrets", "seguridad"]
ShowToc: true
draft: false
---
## Introducción
En algunas ocasiones nuestras aplicaciones desplegadas en kubernetes necesitan información sensible y/o confidencial tales como una contraseña de una base de datos o un token para conectarse a otras aplicaciones.

Desplegar y mantener esta información en nuestro cluster no es siempre trivial o sencilla y en determinados casos de uso es posible que el tipo de objecto [_Secret_](https://kubernetes.io/docs/concepts/configuration/secret/) no sea el mas adecuado.

A lo largo del post vamos a ver como instalar y configurar **Azure Key Vault Provider for Secrets Store CSI Driver**, este componente nos va a permitir leer información de un **Azure Key Vault** y proporcionarla a un Pod a través de un fichero o una variable de entorno.

## Azure Key Vault Provider for Secrets Store CSI Driver
**Container Store Driver (CSI)** es una interfaz que implementan los cloud provider para que los orquestadores de contenedores ([Kubernetes](https://kubernetes-csi.github.io/docs/), [Mesos](https://mesos.apache.org/documentation/latest/csi/), [Nomad](https://developer.hashicorp.com/nomad/docs/concepts/plugins/csi),...)  puedan hacer uso de sus sistemas de almacenamiento a través de una interfaz agnostica a la tecnologia subyacente.
 
**Secrets Store CSI Driver Provider** Permite leer información sensible o confidencial (secretos, certificados,...) de un origen (ej. Azure Key Vault, Amazon Secrets o Google Secret Manager...) montarlos en un Pod utilizando la interfaz Container Store Driver (CSI) o crear automáticamente un secreto con esta información únicamente cuando exista algún Pod que requiera esta información.
 
**Azure Key Vault Provider Secret Store CSI Driver**, nos permite leer información almacenada en un **Azure Key Vault** y montarla en un Pod utilizando la interfaz CSI. Puede utilizarse en cualquier orquestador de contenedores.
 
### Instalación
> Si no tienes desplegado un cluster de kubernetes en Azure puedes utilizar el código de terraform de este [repositorio](https://github.com/fjvela/poc-k8s/tree/main/terraform/azure-aks) para desplegar uno. Para facilitar la prueba, el cluster es público - ¡No uses este código para desplegar un clúster en un entorno productivo! Recuerda borrarlo una vez finalizadas las pruebas para evitar problemas y/o costes innecesarios.
 
Para seguir el post, deberás tener instaladas las siguientes herramientas:
- [Helm3](https://helm.sh/docs/intro/install/)
- [Kubectl cli](https://kubernetes.io/docs/tasks/tools/#kubectl)
- [Az cli](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
 
Para empezar con la instalación debemos decidir qué método de autenticación utilizará **Azure Key Vault Provider for Secrets Store CSI Driver** para leer los secretos del Azure Key Vault. Actualmente existen varios mecanismos:
 
- Workload Identity
- Managed Identities (System-assigned and User-assigned)
- Service Principal

Vamos a utilizar **Service Principal**. Dependiendo de nuestro caso de uso quizá no sea el más recomendable ya que deberemos crear un secreto para almacenar la información de autenticación, pero es el método de autenticación más rápido y sencillo de configurar.

#### Crear service principal (SP)
Creamos un service principal (SP) ejecutando el siguiente comando:

```bash
az ad sp create-for-rbac -n sp-secrets-store-csi-driver-provider-azure
```

Una vez creado el `Service Principal` creamos un secreto en nuestro clúster Kubernetes con los valores de las claves `appId` (usa el valor de la propiedad clientid) y `password` (usa el valor de la propiedad clientsecret) y etiquetamos el secreto con la etiqueta `secrets-store-creds secrets-store.csi.k8s.io/used=true`

```bash
kubectl create secret generic secrets-store-creds --from-literal clientid=<AZURE_CLIENT_ID> --from-literal clientsecret=<AZURE_CLIENT_SECRET> -n myapp

kubectl label secret secrets-store-creds secrets-store.csi.k8s.io/used=true -n myapp
```
#### Crear Azure Key Vault
Creamos el Azure Key Vault donde almacenaremos nuestros secretos y añadimos un secreto:
```bash
az keyvault create --name "kv-secret-store-csi-001" --resource-group "rg-secret-store-westeu" --location "westeurope"
 
az keyvault secret set --name "mysupersecret" --vault-name "kv-secret-store-csi-001" --value "MyVaultValueSecret"
```
 
Asignamos permisos de lectura para que el `service principal` que hemos creado anteriormente pueda leer los secretos:
```bash
az keyvault set-policy -n "kv-secret-store-csi-001" --secret-permissions list get  --spn  <SERVICE_PRINCIPAL_ID>
```
#### Instalación Azure Key Vault Provider Secret Store CSI Driver
Podemos instalar Azure Key Vault Provider Secret Store CSI Driver de varias maneras:
- Helm 3
- Deployment yamls
- En el caso de que estemos utilizando un clúster AKS, podemos habilitar el addon `azure-keyvault-secrets-provider` utilizando `az cli`: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver#enable-and-disable-autorotation (tiene soporte oficial)
 
En nuestro caso vamos a utilizar Helm. Para ello, agregamos el repositorio `secrets-store-csi-driver-provider-azure` e instalamos el chart `csi-secrets-store-provider-azure/csi-secrets-store-provider-azure` en el namespace `kube-system`:

```bash
helm repo add csi-secrets-store-provider-azure https://azure.github.io/secrets-store-csi-driver-provider-azure/charts

helm install csi csi-secrets-store-provider-azure/csi-secrets-store-provider-azure --namespace kube-system --set secrets-store-csi-driver.syncSecret.enabled=true
```
El chart permite configurar los componentes desplegados, puedes comprobar todos los parámetros de configuración [aquí](https://github.com/Azure/secrets-store-csi-driver-provider-azure/blob/master/charts/csi-secrets-store-provider-azure/README.md#configuration).

Una vez instalado, comprobamos que los componentes han arrancado correctamente:
```bash
kubectl get pods -l app=csi-secrets-store-provider-azure -n kube-system
```
![Resultado ejecución 'kubectl get Pods -l app=csi-secrets-store-provider-azure -n kube-system'. Dos Pods en estado running](/2022/kubernetes/secrets-store-csi-driver-provider-azure-running-pods.png)

### Caso de uso: montar la información de un secreto a través de un fichero
A continuación creamos un objeto de tipo `SecretProviderClass`. Este objeto nos permite configurar el Azure Key Vault del que vamos a leer. Puedes encontrar una descripción de todos los parámetros de configuración [aquí](https://azure.github.io/secrets-store-csi-driver-provider-azure/docs/getting-started/usage/#create-your-own-secretproviderclass-object).

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-kv-secret-store-csi-mount-file
spec:
  provider: azure
  parameters:
    keyvaultName: "kv-secret-store-csi-001" # the name of the KeyVault
    tenantId: "YOUR_TENANT_ID" # the tenant ID of the KeyVault
    objects: |
      array:
        - |
          objectName: mysupersecret
          objectAlias: mysupersecret           # [OPTIONAL available for version > 0.0.4] object alias
          objectType: secret              # object types: secret, key or cert. For Key Vault certificates, refer to https://azure.github.io/secrets-store-csi-driver-provider-azure/configurations/getting-certs-and-keys/ for the object type to use
          objectVersion: ""               # [OPTIONAL] object versions, default to latest if empty
          filePermission: 0755            # [OPTIONAL] permission for secret file being mounted into the Pod, default is 0644 if not specified.
```
El siguiente paso será crear un Pod y configurar un volumen para montar los secretos que necesitamos en un directorio:

```yaml
kind: Pod
apiVersion: v1
metadata:
  name: busybox-secrets-store-mount-file
spec:
  containers:
    - name: busybox
      image: k8s.gcr.io/e2e-test-images/busybox:1.29
      command:
        - "/bin/sleep"
        - "10000"
      volumeMounts:
        - name: secrets-store-inline
          mountPath: "/mnt/secrets-store"
          readOnly: true
  volumes:
    - name: secrets-store-inline
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: "azure-kv-secret-store-csi-mount-file"
        nodePublishSecretRef: # Only required when using service principal mode
          name: secrets-store-creds # Only required when using service principal mode. The name of the Kubernetes secret that contains the service principal credentials to access keyvault.
```
Ejecutamos el siguiente comando  para comprobar el contenido del fichero montado automáticamente por el componente:
```shell
kubectl exec busybox-secrets-store-mount-file -n myapp -- cat  /mnt/secrets-store/mysupersecret
```

![Resultado ejecución 'kubectl exec busybox-secrets-store-mount-file -n myapp -- cat  /mnt/secrets-store/mysupersecret'. Muestra 'MyVaultValueSecret'](/2022/kubernetes/secrets-store-csi-driver-provider-azure-result-mount-file.png)

### Caso de uso: montar la información de un secreto a través de una variable de entorno
> El valor del parámetro **syncSecret.enabled** debe estar configurado a **'true'**
 
La configuración para crear un secreto automáticamente, es muy similar. Tan solo tenemos que agregar el bloque de configuración `secretObjects`:
```yaml
  secretObjects: # [OPTIONAL] SecretObjects defines the desired state of synced Kubernetes secret objects
    - secretName: secret-created-automatically # name of the Kubernetes secret object
      type: Opaque # type of Kubernetes secret object (for example, Opaque, kubernetes.io/tls)
      data:
        - key: mysupersecret # data field to populate
          objectName: mysupersecretalias # this could be the object name or the object alias
```

La configuración completa quedaria de la siguiente manera:
```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-kv-secret-store-csi-mount-env-var
spec:
  provider: azure
  parameters:
    keyvaultName: "kv-secret-store-csi-001" # the name of the KeyVault
    tenantId: "328214bc-e88f-43fb-bad1-8f64ff51d823" # the tenant ID of the KeyVault
    objects: |
      array:
        - |
          objectName: mysupersecret
          objectAlias: mysupersecretalias      # [OPTIONAL available for version > 0.0.4] object alias
          objectType: secret              # object types: secret, key or cert. For Key Vault certificates, refer to https://azure.github.io/secrets-store-csi-driver-provider-azure/configurations/getting-certs-and-keys/ for the object type to use
          objectVersion: ""               # [OPTIONAL] object versions, default to latest if empty
 
  secretObjects: # [OPTIONAL] SecretObjects defines the desired state of synced Kubernetes secret objects
    - secretName: secret-created-automatically # name of the Kubernetes secret object
      type: Opaque # type of Kubernetes secret object (for example, Opaque, kubernetes.io/tls)
      data:
        - key: mysupersecret # data field to populate
          objectName: mysupersecretalias # this could be the object name or the object alias
```

Desplegamos un Pod configurando el secreto como una variable de entorno:
```yaml
kind: Pod
apiVersion: v1
metadata:
  name: busybox-secrets-store-mount-env-var
spec:
  containers:
    - name: busybox
      image: k8s.gcr.io/e2e-test-images/busybox:1.29
      command:
        - "/bin/sleep"
        - "10000"
      env:
        - name: SECRET_CREDENTIALS
          valueFrom:
            secretKeyRef:
              name: secret-created-automatically
              key: mysupersecret
      volumeMounts:
        - name: secrets-store-inline
          mountPath: "/mnt/secrets-store"
          readOnly: true
  volumes:
    - name: secrets-store-inline
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: "azure-kv-secret-store-csi-mount-env-var"
        nodePublishSecretRef: # Only required when using service principal mode
          name: secrets-store-creds # Only required when using service principal mode. The name of the Kubernetes secret that contains the service principal credentials to access keyvault.
```

Ejecutamos el siguiente comando  para comprobar el contenido de la variable de entorno:
```shell
kubectl exec busybox-secrets-store-mount-env-var -n myapp -- env | grep SECRET_CREDENTIALS
```

![Resultado ejecución 'kubectl exec busybox-secrets-store-mount-env-var -n myapp -- env | grep SECRET_CREDENTIALS'. Muestra 'MyVaultValueSecret'](/2022/kubernetes/secrets-store-csi-driver-provider-azure-result-mount-env-var.png)

### Rotación de secretos
**Azure Key Vault Provider Secret Store CSI Driver** puede actualizar el valor de un secreto en el caso de que haya sido actualizado en el Azure Key Vault. Actualmente es una funcionalidad en estado alpha, para poder hacer uso de ella debemos habilitarla a través del parámetro `secrets-store-csi-driver.enableSecretRotation`.

Esta funcionalidad tiene algunas limitaciones como por ejemplo que no actualiza correctamente el valor de los secretos en Kubernetes (https://github.com/Azure/secrets-store-csi-driver-provider-azure/issues/1007).

### Métricas
**Azure Key Vault Provider for Secrets Store CSI Driver** nos ofrece diferentes métricas que podemos integrar con [Prometheus](https://prometheus.io/).
 
Para Poder consultar las métricas del componente **`Azure Key Vault Provider`** ejecuta el siguiente comando:
```shell
kubectl port-forward -n kube-system ds/csi-csi-secrets-store-provider-azure 8898:8898 & curl localhost:8898/metrics
```
![Resultado ejecución 'kubectl port-forward -n kube-system ds/csi-csi-secrets-store-provider-azure 8898:8898 & curl localhost:8898/metrics'. Muestra diferentes metricas](/2022/kubernetes/secrets-store-csi-driver-provider-azure-result-metrics-csi-csi-secrets-store-provider-azure.png)
 
Para poder consultar las métricas del componente **`Secrets Store CSI Driver`** ejecuta el siguiente comando:
```shell
kubectl port-forward -n kube-system ds/secrets-store-csi-driver 8080:8080 & curl http://localhost:8080/metrics
```
![Resultado ejecución 'kubectl port-forward -n kube-system ds/secrets-store-csi-driver 8080:8080 & curl http://localhost:8080/metrics'. Muestra diferentes metricas](/2022/kubernetes/secrets-store-csi-driver-provider-azure-result-metrics-secrets-store-csi-driver.png)
 
Puedes encontrar una descripción completa de todas las metricas en el siguiente enlace: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver#metrics
 
> Los nombres de los daemon set y puertos pueden variar dependiendo de los parámetros de configuración.

## Referencias
- https://github.com/container-storage-interface
- https://kubernetes-csi.github.io/docs/
- https://azure.github.io/secrets-store-csi-driver-provider-azure/docs/
- https://github.com/aws/secrets-store-csi-driver-provider-aws
- https://github.com/GoogleCloudPlatform/secrets-store-csi-driver-provider-gcp
- https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver#metrics
