---
author: "Javi Vela"
title: "Azure AD Workload Identity"
summary: >
    Azure Managed Identities, Federated Identity Credentials y Azure AD Workload Identity permiten el acceso seguro a servicios Azure desde Kubernetes sin gestionar credenciales, utilizando tokens de autenticación.
date: "2024-12-29"
tags: ["Azure", "security", "aks", "k8s", "kubernetes"]
ShowToc: true
draft: false
---
> Puedes encontrar el código fuente del post en el siguiente enlace: https://github.com/fjvela/blog-demo-azure-ad-workload-identity

## Introducción
En el siguiente post voy a explicar cómo puedes utilizar _Azure Managed Identities_ y _Azure Federated Identity Credentials_ desde un cluster Kubernetes desplegado en Azure. Esto permitirá a las aplicaciones que se ejecutan en el cluster acceder a servicisos desplegados en Azure sin necesidad de utilizar credenciales. 

Antes de continuar leyendo el post, te recomiendo que leas los posts sobre [Azure Managed Identities](/posts/2024/azure/managed-identities) y [Azure Federated Identity Credentials](/posts/2024/azure/federated-identity-credential). 

En los posts mencionados, explico cómo acceder a los recursos desplegados en Azure sin necesidad de gestionar secretos y/o certificados:
- **Azure Managed Identities**: Se usan en aplicaciones que se ejecutan en servicios de Azure (ej. máquinas virtuales).
- **Azure Federated Identity Credentials**: Se usan en aplicaciones y servicios que se ejecutan fuera de Azure (ej. GitHub Workflow).

## ¿Cómo funciona?
Una _federated identity credential_ permite establecer una relación de confianza entre una **_User managed identity_** y un proveedor de identidad externo (_external identity provider IdP_).

Esta relación permite a Microsoft Identity autenticar una aplicación externa a través del token recibido y el IdP configurado, generando a su vez otro token que permitirá a la aplicación acceder a los recursos desplegados en Azure.

Tras crear la _user managed identity_, podemos configurar hasta un máximo de 20 _federated identity credentials_. 

Para aplicaciones desplegadas en un cluster de Kubernetes, se requiere la siguiente información:
- **issuer**: Dirección URL del proveedor de identidades externo del cluster (IdP).
- **namespace**: Nombre del namespace donde se ejecutarán los pods.
- **service account**: Nombre del _service account_ (SA) asociado a los pods de nuestro workload.
- **audiences**: Indica qué plataforma de identidad de Microsoft debe aceptar el token entrante (por defecto: api://AzureADTokenExchange - el valor depende del entorno cloud utilizado - Fairfax, Mooncake, USNat o USSec).

**Nota**: La combinación de namespace y service account debe ser única en la _user managed identity_.

![Diagrama de funcionamiento federated identity credential](/2024/azure/aks/ad-workload-identity-como-funciona.png "Diagrama de funcionamiento federated identity credential")

1. Cuando Kubernetes inicia un nuevo POD, _AD Workload Identity_ crea un token en un path determinado.
2. La aplicación solicita un token a Microsoft identity platform, utilizando el token generado en el paso 1.
3. Microsoft identity platform valida el token incluido en la petición contra el servicio de validación externo que se ha registrado previamente (OIDC del cluster). Si el token es válido, se genera un token de autenticación para autenticarse contra otros servicios desplegados en Azure (hay que asignar los permisos necesarios en el servicio).
4. La aplicación utiliza el token generado para acceder a los recursos desplegados en Azure.

## Configurar federated identity credentials (Kubernetes)
Para comenzar, necesitamos un proveedor de identidad externo para crear la relación de confianza entre nuestro cluster y las managed identities utilizadas por las aplicaciones que se ejecutan en nuestro cluster. 

Azure nos proporciona el servicio OpenID Connect (OIDC). Para activarlo podemos usar el siguiente comando:

```shell
az aks update --resource-group myResourceGroup --name myAKScluster --enable-oidc-issuer
```

> _Si estás utilizando Amazon Elastic Kubernetes (EKS) o Google Kubernetes Engine (GKE) revisa la siguiente documentación:_
> - https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
> - https://cloud.google.com/kubernetes-engine/enterprise/identity/setup/per-cluster

A continuación, vamos a configurar una _federated identity credential_ para permitir que la aplicación pueda acceder a recursos desplegados en Azure.

Desde el menú "Managed Identities" podemos crear una _User Managed Identity_.

![Cómo crear una User Managed Identity](/2024/azure/managed-identities-crear-user-managed-identity.png "Cómo crear una User Managed Identity")

Una vez creada, añadimos una _federated identity credential_:

1. Azure nos da la opción de configuración para diferentes escenarios, en nuestro caso seleccionamos la opción para configurar Kubernetes.
2. Completamos la información que nos solicita:  
  - Namespace donde se ejecuta la aplicación.
  - Service Account (SA) que utiliza la aplicación.
  - URL del emisor de OIDC de nuestro cluster, puedes consultarla en el portal o través del comando: ```az aks show --name myAKScluster --resource-group myResourceGroup --query "oidcIssuerProfile.issuerUrl" -o tsv```.

![Cómo añadir federated identity credential](/2024/azure/aks/ad-workload-credential-crear.png "Cómo añadir federated identity credential")

![Cómo configurar GitHub federated identity credential](/2024/azure/aks/ad-workload-k8s-configurar.png "Cómo configurar GitHub federated identity credential")

> Después de crear la _user managed identity_ y configurados los federated identity credentials, debemos asignar los permisos correspondientes de acceso.

![Asignar un rol a la user Managed Identity](/2024/azure/aks/ad-workload-credential-asignar-role.png "Asignar un rol a la user Managed Identity")

### Como acceder a un recurso en Azure utilizando una _Managed Identity_ utilizando .NET
Podemos hacer uso de las _Managed Identities_ creadas en Azure a través de los diferentes SDKs disponibles.

Vamos a describir cómo podemos acceder a un _Azure Key Vault_ utilizando código .NET y la librería [Azure.Identity](https://learn.microsoft.com/en-us/dotnet/api/azure.identity):

1. Crea un proyecto .NET, en este caso hemos creado un proyecto tipo Web. 
2. Añade la referencia a la librería Azure.Identity ```dotnet add package Azure.Identity```.

Azure.Identity proporciona varias clases que encapsulan la lógica necesaria para poder obtener un token de autenticación de Microsoft Entra ID haciendo uso de la _Managed Identity_ configurada:

**_DefaultAzureCredential:_** Intenta realizar la autenticación a través de diferentes mecanismos hasta que consigue conectarse con uno de ellos.
![Diagrama funcionamiento DefaultAzureCredential](/2024/azure/managed-identities-DefaultAzureCredential.png "Diagrama funcionamiento DefaultAzureCredential")

```csharp
var credential = new DefaultAzureCredential();
var client = new SecretClient(new Uri("https://mykv.vault.azure.net/"), credential);
```

**_ChainedTokenCredential:_** Intenta realizar la autenticación a través de la _Managed Identity_. Si no lo consigue, intenta conectarse a través de Azure CLI

```csharp
var credential = new ChainedTokenCredential();
var client = new SecretClient(new Uri("https://mykv.vault.azure.net/"), credential);
```

**_ManagedIdentityCredential:_** Utiliza la _Managed Identity_ para solicitar el token de autenticación
```csharp
var credential = new ManagedIdentityCredential();
var client = new SecretClient(new Uri("https://mykv.vault.azure.net/"), credential);
```

El código final de nuestro API controlador es el siguiente:
```csharp
 [ApiController]
 [Route("[controller]")]
 public class SecretController : ControllerBase
 {
     private readonly ILogger<SecretController> _logger;
     private readonly IConfiguration _config;

     public SecretController(ILogger<SecretController> logger, IConfiguration config)
     {
         _logger = logger;
         _config = config;
     }

     [HttpGet(Name = "GetSecret")]
     public IActionResult Get(string name, string credentialType = "DefaultAzureCredential")
     {
         var kvName = _config["KV_NAME"];
         _logger.LogInformation($"C# HTTP trigger function processed a request. {name} {credentialType} {kvName}");

         var tokenCredential = GetTokenCredential(credentialType);
         var client = new SecretClient(new Uri($"https://{kvName}.vault.azure.net/"), tokenCredential);

         return new OkObjectResult(client.GetSecret(name));
     }

     private TokenCredential GetTokenCredential(string credentialType)
     {
         switch (credentialType)
         {
             case "DefaultAzureCredential":
                 return new DefaultAzureCredential();
             case "ChainedTokenCredential":
                 return new ChainedTokenCredential();
             case "ManagedIdentityCredential":
                 return new ManagedIdentityCredential();
         }

         throw new Exception($"The credential type {credentialType} is not valid");
     }
 }
```

### Como configurar _Managed Identity_ en el cluster
Para configurar la _Managed Identity_ en el cluster es necesario crear y asignar una [Service Account (SA)](https://kubernetes.io/docs/concepts/security/service-accounts/) a nuestra aplicación. 

Utilizando las anotaciones `azure.workload.identity/client-id` y `azure.workload.identity/tenant-id` podemos configurar la _Managed Identity_ creada previamente y que utilizaremos con nuestra aplicación. A continuación puedes ver un ejemplo:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa-app-1
  namespace: develop
  annotations:
    azure.workload.identity/client-id: "3d49c3ea-369c-4af2-b770-3a5de4d0aca2"
    azure.workload.identity/tenant-id: "xxxxxx-xxx-x-x-x"
```
Además es necesario añadir la etiqueta `azure.workload.identity/use` a los pods de nuestra aplicación para indicarle a _Azure AD Workload Identity_ que debe crear un token de autenticación en el POD utilizando los datos de configuración proporcionados en la Service Account (SA).

A continuación puedes encontrar el código yaml necesario para desplegar la aplicación en el cluster kubernetes haciendo uso de una _Managed Identity_ creada previamente:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: develop
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa-app-1
  namespace: develop
  annotations:
    azure.workload.identity/client-id: "3d49c3ea-369c-4af2-b770-3a5de4d0aca2"
    azure.workload.identity/tenant-id: "xxxxxx-xxx-x-x-x"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: myapp
  name: myapp
  namespace: develop
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  strategy: {}
  template:
    metadata:
      labels:
        app: myapp
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: sa-app-1
      containers:
        - image: acrqi99.azurecr.io/app:1.0.0
          name: app
          ports:
            - containerPort: 8080
          env:
            - name: KV_NAME
              value: kv-qi99
          resources: {}
```

Una vez desplegada la aplicación podemos comprobar como _Azure AD Workload Identity_ ha modificado la configuración del POD para que la aplicación pueda acceder a los servicios desplegados en Azure haciendo uso de la _Managed Identity_ configurada:

![POD valores inyectados por _Azure AD Workload Identity_](/2024/azure/aks/ad-workload-result-inject-env-vars.png "Resultado contenido secreto")

Realizando una llamada GET para consultar la información del secreto `secret-sauce`, podemos comprobar que la _Managed Identity_ ha sido configurada correctamente:

![Resultado contenido secreto](/2024/azure/aks/ad-workload-result.png "Resultado contenido secreto")

## Conclusión
La implementación de _Azure Managed Identities_ junto con _Azure Federated Identity Credentials_ y _Azure AD Workload Identity_ proporciona una solución robusta y segura para gestionar el acceso a servicios de Azure a aplicaciones que se ejecutan en un cluster de Kubernetes.

Esta solución elimina la necesidad de gestionar credenciales manualmente, reduciendo significativamente los riesgos de seguridad asociados con el manejo de secretos y certificados.

Las ventajas principales de esta solución son:
- Eliminar la gestión manual de credenciales.
- Mayor seguridad al no almacenar secretos en el código o en el cluster.
- Escalabilidad para múltiples aplicaciones y servicios.
- Compatibilidad con múltiples entornos y proveedores de Kubernetes.

## Referencias
- https://azure.github.io/azure-workload-identity/docs/
- https://learn.microsoft.com/en-us/azure/aks/aks/use-oidc-issuer
- https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- https://cloud.google.com/kubernetes-engine/enterprise/identity/setup/per-cluster
