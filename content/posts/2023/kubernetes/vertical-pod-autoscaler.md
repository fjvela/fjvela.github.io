---
author: "Javi Vela"
title: "Kubernetes - Vertical Pod Autoscaler"
summary: >
  La **escalabilidad vertical** permite **aumentar la memoria y CPU** de las réplicas dinámicamente dependiendo del uso de memoria y CPU de la aplicación. El componente VPA (Vertical Pod Autoscaler) permite realizar estos cambios automáticamente en nuestro clúster Kubernetes.
date: "2023-05-18"
tags: ["kubernetes", "k8s", "autoscaler"]
ShowToc: true
draft: false
---
Una de las mayores ventajas del uso de Kubernetes (K8S) para ejecutar nuestras aplicaciones es la **escalabilidad**, gracias a ella podemos gestionar los recursos de una manera más eficiente.

Existen dos tipos de escalabilidad:, la **escalabilidad horizontal**, que aumenta el **número de réplicas** (Deployments o Stateful) de nuestra aplicación dependiendo del uso de memoria y CPU de la aplicación. Si el consumo de CPU y/o memoria aumenta, el número de réplicas aumentará, y si disminuye, disminuirá el número de réplicas de la aplicación. En Kubernetes, el [HPA (Horizontal Pod Autoscaler)](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) es el encargado de monitorizar y escalar horizontalmente las aplicaciones.

La **escalabilidad vertical** permite **aumentar la memoria y CPU** de las réplicas dinámicamente dependiendo del uso de memoria y CPU de la aplicación. El componente VPA (Vertical Pod Autoscaler) permite realizar estos cambios automáticamente en nuestro clúster Kubernetes.

## Vertical Pod Autoscaler (VPA)

Consta de tres componentes:
- [Recommender](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/README.md): es el componente principal del VPA, cuya misión es generar recomendaciones de asignación de CPU y memoria basados en el histórico y consumo actual de CPU y memoria.
[![Diagrama funcionamiento Recommender](/2023/kubernetes/vertical-pod-autoscaler-recommender.png)](/2023/kubernetes/vertical-pod-autoscaler-recommender.png)

- [Updater](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/README.md): decide qué Pods deben ser reiniciados basándose en los datos del `recommender`. Si se debe ajustar la CPU y memoria de un pod, intentará terminar su ejecución (revisando [Pod Disruption Budget (PDB)](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)) - evento `EvictedByVPA` . La actualización de la asignación de los recursos es realizada por el `Admission Controller`.
[![Diagrama funcionamiento Updater](/2023/kubernetes/vertical-pod-autoscaler-updater.png)](/2023/kubernetes/vertical-pod-autoscaler-updater.png)

- [Admission Controller](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/admission-controller/README.md): por cada Pod creado en el clúster, comprueba si debe realizar una actualización de los recursos asignados basándose en la configuración y recomendaciones del VPA (si la hay).

[![Diagrama funcionamiento Admission Controller](/2023/kubernetes/vertical-pod-autoscaler-all.png)](/2023/kubernetes/vertical-pod-autoscaler-all.png)

### Objecto VPA (Vertical Pod Autoscaler)
Para poder definir el comportamiento del VPA para nuestros Pods es necesario crear un recurso de tipo `VerticalPodAutoscaler`:

```yaml
apiVersion: "autoscaling.k8s.io/v1"
kind: VerticalPodAutoscaler
metadata:
  name: hamster-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: hamster
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: '*'
        minAllowed:
          cpu: 100m
          memory: 50Mi
        maxAllowed:
          cpu: 1
          memory: 500Mi
        controlledResources: ["cpu", "memory"]
```

- **targetRef**: Indicaremos el recurso sobre el que el VPA actuará:
  - **kind**: tipo de controlador (ej.: deployment o daemonset) que controla los Pods a monitorizar y actualizar los recursos asignados a los Pods
  - **name**: nombre del recurso 
- **containerPolicies**:
  - **containerName**: Nombre del contenedor (podemos usar `*` para aplicar la configuración a todos los containers del pod)
  - **minAllowed**: Los recursos mínimos que el VPA puede asignar al container (CPU y/o memoria)
  - **maxAllowed**: Los recursos máximos que el VPA puede asignar al container (CPU y/o memoria)
  - **controlledResources**: El tipo de recurso o recusos a monitorizar (CPU y/o memoria)
- **updatePolicy**: VPA ofrece cuatro modos para aplicar las recomendaciones de asignación de CPU y memoria:
  - **Off**: El `recommender` calcula las recomendaciones de asignación de recursos pero el `updater` nunca reinicia los Pods para aplicar los cambios (modo "dry-run")
  - **Initial**: Solo se se asignan las recomendaciones cuando se crea el pod, no se realiza ningún cambio durante el ciclo de vida del mismo
  - **Recreate**: El VPA puede asignar las recomendaciones cuando se crea el Pod y durante su ciclo de vida
  - **Auto**: Actualmente equivale a la opción `Recreate` ya que es el unico metodo de actualización disponible (valor por defecto)


### Instalación
A día de hoy, VPA no está incluido como un componente en Kubernetes por lo que es necesario instalarlo desde su repositorio. 

> :warning: **Revisa las instrucciones de instalación, es posible que hayan cambiado.**

#### Minikube
Desplegar los componentes del VPA es muy sencillo:
1. Clonaremos el repositorio https://github.com/kubernetes/autoscaler/tree/master
2. Ejecutamos el comando `./hack/vpa-up.sh` desde la carpeta `vertical-pod-autoscaler`

#### Azure (Azure Kubernetes Service)
Azure permite habilitar/deshabilitar Vertical Pod Autoscaler en un clúster AKS. Para ello, debemos registrar el "feature flag" `AKS-VPAPreview` en nuestra subscripción utilizando el siguiente comando: `az feature register --namespace "Microsoft.ContainerService" --name "AKS-VPAPreview"`.

Una vez registrado, podemos utilizar Terraform, Bicep o az cli para desplegar automáticamente VPA en nuestro clúster.

Si estás utilizando Terraform, asegúrate de usar al menos la [versión 3.47 de terraform-provider-azurerm](https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.47.0/CHANGELOG.md) y agrega el siguiente bloque de código al recurso `azurerm_kubernetes_cluster`:

``` terraform
  workload_autoscaler_profile {
    vertical_pod_autoscaler_enabled = true
  }
```

> Puedes utilizar el código de Terraform de este [repositorio](https://github.com/fjvela/poc-k8s/tree/main/terraform/azure-aks-vpa) para desplegar un clúster AKS con el componente VPA desplegado. Para facilitar la prueba, el clúster es público. 

> :warning: ¡No utilices este código para desplegar un clúster en un entorno productivo! Recuerda borrarlo una vez finalizadas las pruebas para evitar problemas y/o costes innecesarios.

Si utilizas Bicep, puedes encontrar cómo habilitarlo en el siguiente enlace: https://learn.microsoft.com/en-us/azure/templates/microsoft.containerservice/managedclusters?pivots=deployment-language-bicep#managedclusterworkloadautoscalerprofileverticalpodau

También puedes utilizar la línea de comandos `az`, puedes consultar los comandos necesarios en el enlace: https://learn.microsoft.com/en-us/azure/aks/vertical-pod-autoscaler#deploy-upgrade-or-disable-vpa-on-a-cluster

Ten en cuenta que la versión desplegada por Azure es una versión del Vertical Pod Autoscaler modificada por Microsoft, su funcionamiento y rendimiento deberían ser mejores y optimizados para trabajar en un clúster AKS.

#### Comprobación de la instalación
Los componentes se instalan en el namespace `kube-system`, comprobamos que los tres componentes están arrancados y funcionan sin problema (`kubectl get pods -l  'app in( vpa-admission-controller, vpa-recommender, vpa-updater)' -n kube-system)`):

[![Muestra los 3 Pods ejecutándose en el cluster](/2023/kubernetes/vertical-pod-autoscaler-vpa-instalacion-ok.png)](/2023/kubernetes/vertical-pod-autoscaler-vpa-instalacion-ok.png)

### Funcionamiento
El siguiente paso es ejecutar un ejemplo para poder revisar el funcionamiento del VPA en el clúster, en el propio repositorio podemos encontrar el siguiente ejemplo:

```yaml
apiVersion: "autoscaling.k8s.io/v1"
kind: VerticalPodAutoscaler
metadata:
  name: hamster-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: hamster
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: '*'
        minAllowed:
          cpu: 100m
          memory: 50Mi
        maxAllowed:
          cpu: 1
          memory: 500Mi
        controlledResources: ["cpu", "memory"]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hamster
spec:
  selector:
    matchLabels:
      app: hamster
  replicas: 2
  template:
    metadata:
      labels:
        app: hamster
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534 # nobody
      containers:
        - name: hamster
          image: registry.k8s.io/ubuntu-slim:0.1
          resources:
            requests:
              cpu: 100m
              memory: 50Mi
          command: ["/bin/sh"]
          args:
            - "-c"
            - "while true; do timeout 0.5s yes >/dev/null; sleep 0.5s; done"
```

En el ejemplo, podemos ver la definición de un objeto VPA, el cual actuará sobre el `Deployment` `hamster` y monitorizará tanto la memoria como la CPU consumida por los pods del deployment. Los recursos mínimos y máximos que podrá asignar son los siguientes:

|          | Mínimo   | Máximo   |
| -------- | -------- | -------- |
| CPU      | 100m     | 1        |
| Memoria  | 50Mi     | 500Mi    |

#### Logs recommender
Cada 1 minuto, el `recommender` comprueba las métricas y calcula si es necesario realizar una actualización de los recursos:

```
I0515 16:59:00.167961       1 recommender.go:168] Recommender Run
I0515 16:59:00.168058       1 cluster_feeder.go:355] Start selecting the vpaCRDs.
I0515 16:59:00.168066       1 cluster_feeder.go:390] Fetched 1 VPAs.
I0515 16:59:00.168093       1 cluster_feeder.go:400] Using selector app=hamster for VPA default/hamster-vpa
I0515 16:59:00.174398       1 metrics_client.go:77] 11 podMetrics retrieved for all namespaces
I0515 16:59:00.174452       1 cluster_feeder.go:478] ClusterSpec fed with #22 ContainerUsageSamples for #11 containers. Dropped #0 samples.
I0515 16:59:00.174460       1 recommender.go:178] ClusterState is tracking 13 PodStates and 1 VPAs
I0515 16:59:00.194835       1 checkpoint_writer.go:114] Saved VPA default/hamster-vpa checkpoint for hamster
I0515 16:59:00.194867       1 cluster.go:362] Garbage collection of AggregateCollectionStates triggered
I0515 16:59:00.194890       1 recommender.go:188] ClusterState is tracking 12 aggregated container states
```

Cuando se genera una recomendación, se puede consultar en el objeto VPA. Para ello ejecutamos el comando `kubectl get vpa -o=jsonpath='{.items[0].status}' | jq` : 

[![VPA recomendación aumento recursos](/2023/kubernetes/vertical-pod-autoscaler-vpa-recomendation-saved.png)](/2023/kubernetes/vertical-pod-autoscaler-vpa-recomendation-saved.png)

#### Logs updater
En el caso de que haya una recomendación por parte del `recommender`, el `updater` eliminará los Pods asociados al deployment (razón: `EvictedByVPA` ). Este proceso también se ejecuta cada 1 minuto.

```
I0515 17:11:06.957414       1 api.go:92] Initial VPA synced successfully
I0515 17:11:06.957601       1 reflector.go:221] Starting reflector *v1.Pod (1h0m0s) from k8s.io/autoscaler/vertical-pod-autoscaler/pkg/updater/logic/updater.go:289
I0515 17:11:06.957675       1 reflector.go:257] Listing and watching *v1.Pod from k8s.io/autoscaler/vertical-pod-autoscaler/pkg/updater/logic/updater.go:289
I0515 17:12:06.959731       1 update_priority_calculator.go:143] pod accepted for update default/hamster-65cd4dd797-mc9f5 with priority 8.870000000000001
I0515 17:12:06.959861       1 update_priority_calculator.go:143] pod accepted for update default/hamster-65cd4dd797-jqblb with priority 8.870000000000001
I0515 17:12:06.959890       1 updater.go:215] evicting pod hamster-65cd4dd797-mc9f5
I0515 17:12:06.976619       1 event.go:285] Event(v1.ObjectReference{Kind:"Pod", Namespace:"default", Name:"hamster-65cd4dd797-mc9f5", UID:"d22d508d-26f4-4d89-b371-edd744018f57", APIVersion:"v1", ResourceVersion:"118847", FieldPath:""}): type: 'Normal' reason: 'EvictedByVPA' Pod was evicted by VPA Updater to apply resource recommendation.
I0515 17:13:06.951468       1 update_priority_calculator.go:143] pod accepted for update default/hamster-65cd4dd797-jqblb with priority 8.870000000000001
I0515 17:13:06.951508       1 update_priority_calculator.go:129] not updating a short-lived pod default/hamster-65cd4dd797-jxgtj, request within recommended range
I0515 17:13:06.951520       1 updater.go:215] evicting pod hamster-65cd4dd797-jqblb
I0515 17:13:06.969737       1 event.go:285] Event(v1.ObjectReference{Kind:"Pod", Namespace:"default", Name:"hamster-65cd4dd797-jqblb", UID:"c7de721e-cc47-4906-8c15-10b4e4725b82", APIVersion:"v1", ResourceVersion:"118845", FieldPath:""}): type: 'Normal' reason: 'EvictedByVPA' Pod was evicted by VPA Updater to apply resource recommendation.
I0515 17:14:06.949563       1 update_priority_calculator.go:129] not updating a short-lived pod default/hamster-65cd4dd797-jxgtj, request within recommended range
I0515 17:14:06.949598       1 update_priority_calculator.go:129] not updating a short-lived pod default/hamster-65cd4dd797-qj6tg, request within recommended range
```

Con el comando `kubectl get event --field-selector reason=EvictedByVPA` podemos comprobar los eventos de borrado de los Pods para poder asignarles los nuevos recursos:

[![Eventos Kubernetes borrado Pods](/2023/kubernetes/vertical-pod-autoscaler-vpa-updated-events.png)](/2023/kubernetes/vertical-pod-autoscaler-vpa-updated-events.png)

#### Logs Admission Controller
Todas las solicitudes de creación de un nuevo Pod son enviadas a los `admission controller` desplegados en el clúster. En nuestro caso, comprobará si es necesario actualizar los recursos asignados al pod:

```
I0515 17:11:27.569672       1 handler.go:91] Processing vpa: &{{VerticalPodAutoscaler autoscaling.k8s.io/v1} {hamster-vpa  default    0 0001-01-01 00:00:00 +0000 UTC <nil> <nil> map[] map[kubectl.kubernetes.io/last-applied-configuration:{"apiVersion":"autoscaling.k8s.io/v1","kind":"VerticalPodAutoscaler","metadata":{"annotations":{},"name":"hamster-vpa","namespace":"default"},"spec":{"resourcePolicy":{"containerPolicies":[{"containerName":"*","controlledResources":["cpu","memory"],"maxAllowed":{"cpu":1,"memory":"500Mi"},"minAllowed":{"cpu":"100m","memory":"50Mi"}}]},"targetRef":{"apiVersion":"apps/v1","kind":"Deployment","name":"hamster"},"updatePolicy":{"updateMode":"Auto"}}}
] [] [] [{kubectl-client-side-apply Update autoscaling.k8s.io/v1 2023-05-15 17:11:27 +0000 UTC FieldsV1 {"f:metadata":{"f:annotations":{".":{},"f:kubectl.kubernetes.io/last-applied-configuration":{}}},"f:spec":{".":{},"f:resourcePolicy":{".":{},"f:containerPolicies":{}},"f:targetRef":{},"f:updatePolicy":{".":{},"f:updateMode":{}}}} }]} {&CrossVersionObjectReference{Kind:Deployment,Name:hamster,APIVersion:apps/v1,} 0xc000596d20 0xc00068cd80 []} {<nil> []}}
I0515 17:11:27.598513       1 handler.go:79] Admitting pod {hamster-65cd4dd797-% hamster-65cd4dd797- default    0 0001-01-01 00:00:00 +0000 UTC <nil> <nil> map[app:hamster pod-template-hash:65cd4dd797] map[] [{apps/v1 ReplicaSet hamster-65cd4dd797 bf57314a-36a6-48fd-a297-269d21f364a4 0xc000320d27 0xc000320d28}] [] [{kube-controller-manager Update v1 2023-05-15 17:11:27 +0000 UTC FieldsV1 {"f:metadata":{"f:generateName":{},"f:labels":{".":{},"f:app":{},"f:pod-template-hash":{}},"f:ownerReferences":{".":{},"k:{\"uid\":\"bf57314a-36a6-48fd-a297-269d21f364a4\"}":{}}},"f:spec":{"f:containers":{"k:{\"name\":\"hamster\"}":{".":{},"f:args":{},"f:command":{},"f:image":{},"f:imagePullPolicy":{},"f:name":{},"f:resources":{".":{},"f:requests":{".":{},"f:cpu":{},"f:memory":{}}},"f:terminationMessagePath":{},"f:terminationMessagePolicy":{}}},"f:dnsPolicy":{},"f:enableServiceLinks":{},"f:restartPolicy":{},"f:schedulerName":{},"f:securityContext":{".":{},"f:runAsNonRoot":{},"f:runAsUser":{}},"f:terminationGracePeriodSeconds":{}}} }]}
I0515 17:11:27.598984       1 matcher.go:68] Let's choose from 1 configs for pod default/hamster-65cd4dd797-%
I0515 17:11:27.600342       1 recommendation_provider.go:90] updating requirements for pod hamster-65cd4dd797-%.
I0515 17:11:27.600588       1 recommendation_provider.go:57] no matching recommendation found for container hamster, skipping
I0515 17:11:27.600671       1 server.go:112] Sending patches: [{add /metadata/annotations map[]} {add /metadata/annotations/vpaUpdates Pod resources updated by hamster-vpa: container 0: } {add /metadata/annotations/vpaObservedContainers hamster}]
I0515 17:11:27.609234       1 handler.go:79] Admitting pod {hamster-65cd4dd797-% hamster-65cd4dd797- default    0 0001-01-01 00:00:00 +0000 UTC <nil> <nil> map[app:hamster pod-template-hash:65cd4dd797] map[] [{apps/v1 ReplicaSet hamster-65cd4dd797 bf57314a-36a6-48fd-a297-269d21f364a4 0xc00080c927 0xc00080c928}] [] [{kube-controller-manager Update v1 2023-05-15 17:11:27 +0000 UTC FieldsV1 {"f:metadata":{"f:generateName":{},"f:labels":{".":{},"f:app":{},"f:pod-template-hash":{}},"f:ownerReferences":{".":{},"k:{\"uid\":\"bf57314a-36a6-48fd-a297-269d21f364a4\"}":{}}},"f:spec":{"f:containers":{"k:{\"name\":\"hamster\"}":{".":{},"f:args":{},"f:command":{},"f:image":{},"f:imagePullPolicy":{},"f:name":{},"f:resources":{".":{},"f:requests":{".":{},"f:cpu":{},"f:memory":{}}},"f:terminationMessagePath":{},"f:terminationMessagePolicy":{}}},"f:dnsPolicy":{},"f:enableServiceLinks":{},"f:restartPolicy":{},"f:schedulerName":{},"f:securityContext":{".":{},"f:runAsNonRoot":{},"f:runAsUser":{}},"f:terminationGracePeriodSeconds":{}}} }]}
I0515 17:11:27.609377       1 matcher.go:68] Let's choose from 1 configs for pod default/hamster-65cd4dd797-%
I0515 17:11:27.609391       1 recommendation_provider.go:90] updating requirements for pod hamster-65cd4dd797-%.
I0515 17:11:27.609399       1 recommendation_provider.go:57] no matching recommendation found for container hamster, skipping
I0515 17:11:27.609444       1 server.go:112] Sending patches: [{add /metadata/annotations map[]} {add /metadata/annotations/vpaUpdates Pod resources updated by hamster-vpa: container 0: } {add /metadata/annotations/vpaObservedContainers hamster}]
I0515 17:12:00.170779       1 handler.go:91] Processing vpa: &{{VerticalPodAutoscaler autoscaling.k8s.io/v1} {hamster-vpa  default  49f80082-26b4-4511-b096-b2e5a477b34d 118818 1 2023-05-15 17:11:27 +0000 UTC <nil> <nil> map[] map[kubectl.kubernetes.io/last-applied-configuration:{"apiVersion":"autoscaling.k8s.io/v1","kind":"VerticalPodAutoscaler","metadata":{"annotations":{},"name":"hamster-vpa","namespace":"default"},"spec":{"resourcePolicy":{"containerPolicies":[{"containerName":"*","controlledResources":["cpu","memory"],"maxAllowed":{"cpu":1,"memory":"500Mi"},"minAllowed":{"cpu":"100m","memory":"50Mi"}}]},"targetRef":{"apiVersion":"apps/v1","kind":"Deployment","name":"hamster"},"updatePolicy":{"updateMode":"Auto"}}}
] [] [] [{kubectl-client-side-apply Update autoscaling.k8s.io/v1 2023-05-15 17:11:27 +0000 UTC FieldsV1 {"f:metadata":{"f:annotations":{".":{},"f:kubectl.kubernetes.io/last-applied-configuration":{}}},"f:spec":{".":{},"f:resourcePolicy":{".":{},"f:containerPolicies":{}},"f:targetRef":{},"f:updatePolicy":{".":{},"f:updateMode":{}}}} } {recommender Update autoscaling.k8s.io/v1 2023-05-15 17:12:00 +0000 UTC FieldsV1 {"f:status":{".":{},"f:conditions":{},"f:recommendation":{".":{},"f:containerRecommendations":{}}}} }]} {&CrossVersionObjectReference{Kind:Deployment,Name:hamster,APIVersion:apps/v1,} 0xc000411b90 0xc00088c378 []} {0xc00088c450 [{RecommendationProvided True 2023-05-15 17:12:00 +0000 UTC  }]}}
I0515 17:12:06.982108       1 handler.go:79] Admitting pod {hamster-65cd4dd797-% hamster-65cd4dd797- default    0 0001-01-01 00:00:00 +0000 UTC <nil> <nil> map[app:hamster pod-template-hash:65cd4dd797] map[] [{apps/v1 ReplicaSet hamster-65cd4dd797 bf57314a-36a6-48fd-a297-269d21f364a4 0xc0008a2157 0xc0008a2158}] [] [{kube-controller-manager Update v1 2023-05-15 17:12:06 +0000 UTC FieldsV1 {"f:metadata":{"f:generateName":{},"f:labels":{".":{},"f:app":{},"f:pod-template-hash":{}},"f:ownerReferences":{".":{},"k:{\"uid\":\"bf57314a-36a6-48fd-a297-269d21f364a4\"}":{}}},"f:spec":{"f:containers":{"k:{\"name\":\"hamster\"}":{".":{},"f:args":{},"f:command":{},"f:image":{},"f:imagePullPolicy":{},"f:name":{},"f:resources":{".":{},"f:requests":{".":{},"f:cpu":{},"f:memory":{}}},"f:terminationMessagePath":{},"f:terminationMessagePolicy":{}}},"f:dnsPolicy":{},"f:enableServiceLinks":{},"f:restartPolicy":{},"f:schedulerName":{},"f:securityContext":{".":{},"f:runAsNonRoot":{},"f:runAsUser":{}},"f:terminationGracePeriodSeconds":{}}} }]}
I0515 17:12:06.982216       1 matcher.go:68] Let's choose from 1 configs for pod default/hamster-65cd4dd797-%
I0515 17:12:06.982226       1 recommendation_provider.go:90] updating requirements for pod hamster-65cd4dd797-%.
I0515 17:12:06.983687       1 server.go:112] Sending patches: [{add /metadata/annotations map[]} {add /spec/containers/0/resources/requests/cpu 587m} {add /spec/containers/0/resources/requests/memory 262144k} {add /metadata/annotations/vpaUpdates Pod resources updated by hamster-vpa: container 0: cpu request, memory request} {add /metadata/annotations/vpaObservedContainers hamster}]
I0515 17:13:00.163171       1 handler.go:91] Processing vpa: &{{VerticalPodAutoscaler autoscaling.k8s.io/v1} {hamster-vpa  default  49f80082-26b4-4511-b096-b2e5a477b34d 118878 2 2023-05-15 17:11:27 +0000 UTC <nil> <nil> map[] map[kubectl.kubernetes.io/last-applied-configuration:{"apiVersion":"autoscaling.k8s.io/v1","kind":"VerticalPodAutoscaler","metadata":{"annotations":{},"name":"hamster-vpa","namespace":"default"},"spec":{"resourcePolicy":{"containerPolicies":[{"containerName":"*","controlledResources":["cpu","memory"],"maxAllowed":{"cpu":1,"memory":"500Mi"},"minAllowed":{"cpu":"100m","memory":"50Mi"}}]},"targetRef":{"apiVersion":"apps/v1","kind":"Deployment","name":"hamster"},"updatePolicy":{"updateMode":"Auto"}}}
] [] [] [{kubectl-client-side-apply Update autoscaling.k8s.io/v1 2023-05-15 17:11:27 +0000 UTC FieldsV1 {"f:metadata":{"f:annotations":{".":{},"f:kubectl.kubernetes.io/last-applied-configuration":{}}},"f:spec":{".":{},"f:resourcePolicy":{".":{},"f:containerPolicies":{}},"f:targetRef":{},"f:updatePolicy":{".":{},"f:updateMode":{}}}} } {recommender Update autoscaling.k8s.io/v1 2023-05-15 17:13:00 +0000 UTC FieldsV1 {"f:status":{".":{},"f:conditions":{},"f:recommendation":{".":{},"f:containerRecommendations":{}}}} }]} {&CrossVersionObjectReference{Kind:Deployment,Name:hamster,APIVersion:apps/v1,} 0xc0007366f0 0xc00080e708 []} {0xc00080e7e0 [{RecommendationProvided True 2023-05-15 17:12:00 +0000 UTC  }]}}
I0515 17:13:06.976062       1 handler.go:79] Admitting pod {hamster-65cd4dd797-% hamster-65cd4dd797- default    0 0001-01-01 00:00:00 +0000 UTC <nil> <nil> map[app:hamster pod-template-hash:65cd4dd797] map[] [{apps/v1 ReplicaSet hamster-65cd4dd797 bf57314a-36a6-48fd-a297-269d21f364a4 0xc0008a2427 0xc0008a2428}] [] [{kube-controller-manager Update v1 2023-05-15 17:13:06 +0000 UTC FieldsV1 {"f:metadata":{"f:generateName":{},"f:labels":{".":{},"f:app":{},"f:pod-template-hash":{}},"f:ownerReferences":{".":{},"k:{\"uid\":\"bf57314a-36a6-48fd-a297-269d21f364a4\"}":{}}},"f:spec":{"f:containers":{"k:{\"name\":\"hamster\"}":{".":{},"f:args":{},"f:command":{},"f:image":{},"f:imagePullPolicy":{},"f:name":{},"f:resources":{".":{},"f:requests":{".":{},"f:cpu":{},"f:memory":{}}},"f:terminationMessagePath":{},"f:terminationMessagePolicy":{}}},"f:dnsPolicy":{},"f:enableServiceLinks":{},"f:restartPolicy":{},"f:schedulerName":{},"f:securityContext":{".":{},"f:runAsNonRoot":{},"f:runAsUser":{}},"f:terminationGracePeriodSeconds":{}}} }]}
I0515 17:13:06.976162       1 matcher.go:68] Let's choose from 1 configs for pod default/hamster-65cd4dd797-%
I0515 17:13:06.976171       1 recommendation_provider.go:90] updating requirements for pod hamster-65cd4dd797-%.
I0515 17:13:06.976209       1 server.go:112] Sending patches: [{add /metadata/annotations map[]} {add /spec/containers/0/resources/requests/cpu 587m} {add /spec/containers/0/resources/requests/memory 262144k} {add /metadata/annotations/vpaUpdates Pod resources updated by hamster-vpa: container 0: cpu request, memory request} {add /metadata/annotations/vpaObservedContainers hamster}]
I0515 17:14:00.160455       1 handler.go:91] Processing vpa: &{{VerticalPodAutoscaler autoscaling.k8s.io/v1} {hamster-vpa  default  49f80082-26b4-4511-b096-b2e5a477b34d 118956 3 2023-05-15 17:11:27 +0000 UTC <nil> <nil> map[] map[kubectl.kubernetes.io/last-applied-configuration:{"apiVersion":"autoscaling.k8s.io/v1","kind":"VerticalPodAutoscaler","metadata":{"annotations":{},"name":"hamster-vpa","namespace":"default"},"spec":{"resourcePolicy":{"containerPolicies":[{"containerName":"*","controlledResources":["cpu","memory"],"maxAllowed":{"cpu":1,"memory":"500Mi"},"minAllowed":{"cpu":"100m","memory":"50Mi"}}]},"targetRef":{"apiVersion":"apps/v1","kind":"Deployment","name":"hamster"},"updatePolicy":{"updateMode":"Auto"}}}
] [] [] [{kubectl-client-side-apply Update autoscaling.k8s.io/v1 2023-05-15 17:11:27 +0000 UTC FieldsV1 {"f:metadata":{"f:annotations":{".":{},"f:kubectl.kubernetes.io/last-applied-configuration":{}}},"f:spec":{".":{},"f:resourcePolicy":{".":{},"f:containerPolicies":{}},"f:targetRef":{},"f:updatePolicy":{".":{},"f:updateMode":{}}}} } {recommender Update autoscaling.k8s.io/v1 2023-05-15 17:14:00 +0000 UTC FieldsV1 {"f:status":{".":{},"f:conditions":{},"f:recommendation":{".":{},"f:containerRecommendations":{}}}} }]} {&CrossVersionObjectReference{Kind:Deployment,Name:hamster,APIVersion:apps/v1,} 0xc00042ff40 0xc0006a0510 []} {0xc0006a05e8 [{RecommendationProvided True 2023-05-15 17:12:00 +0000 UTC  }]}}
I0515 17:15:00.165045       1 handler.go:91] Processing vpa: &{{VerticalPodAutoscaler autoscaling.k8s.io/v1} {hamster-vpa  default  49f80082-26b4-4511-b096-b2e5a477b34d 119037 4 2023-05-15 17:11:27 +0000 UTC <nil> <nil> map[] map[kubectl.kubernetes.io/last-applied-configuration:{"apiVersion":"autoscaling.k8s.io/v1","kind":"VerticalPodAutoscaler","metadata":{"annotations":{},"name":"hamster-vpa","namespace":"default"},"spec":{"resourcePolicy":{"containerPolicies":[{"containerName":"*","controlledResources":["cpu","memory"],"maxAllowed":{"cpu":1,"memory":"500Mi"},"minAllowed":{"cpu":"100m","memory":"50Mi"}}]},"targetRef":{"apiVersion":"apps/v1","kind":"Deployment","name":"hamster"},"updatePolicy":{"updateMode":"Auto"}}}
] [] [] [{kubectl-client-side-apply Update autoscaling.k8s.io/v1 2023-05-15 17:11:27 +0000 UTC FieldsV1 {"f:metadata":{"f:annotations":{".":{},"f:kubectl.kubernetes.io/last-applied-configuration":{}}},"f:spec":{".":{},"f:resourcePolicy":{".":{},"f:containerPolicies":{}},"f:targetRef":{},"f:updatePolicy":{".":{},"f:updateMode":{}}}} } {recommender Update autoscaling.k8s.io/v1 2023-05-15 17:15:00 +0000 UTC FieldsV1 {"f:status":{".":{},"f:conditions":{},"f:recommendation":{".":{},"f:containerRecommendations":{}}}} }]} {&CrossVersionObjectReference{Kind:Deployment,Name:hamster,APIVersion:apps/v1,} 0xc00037b320 0xc00088c750 []} {0xc00088c828 [{RecommendationProvided True 2023-05-15 17:12:00 +0000 UTC  }]}}
I0515 17:16:00.159714       1 handler.go:91] Processing vpa: &{{VerticalPodAutoscaler autoscaling.k8s.io/v1} {hamster-vpa  default  49f80082-26b4-4511-b096-b2e5a477b34d 119092 5 2023-05-15 17:11:27 +0000 UTC <nil> <nil> map[] map[kubectl.kubernetes.io/last-applied-configuration:{"apiVersion":"autoscaling.k8s.io/v1","kind":"VerticalPodAutoscaler","metadata":{"annotations":{},"name":"hamster-vpa","namespace":"default"},"spec":{"resourcePolicy":{"containerPolicies":[{"containerName":"*","controlledResources":["cpu","memory"],"maxAllowed":{"cpu":1,"memory":"500Mi"},"minAllowed":{"cpu":"100m","memory":"50Mi"}}]},"targetRef":{"apiVersion":"apps/v1","kind":"Deployment","name":"hamster"},"updatePolicy":{"updateMode":"Auto"}}}
] [] [] [{kubectl-client-side-apply Update autoscaling.k8s.io/v1 2023-05-15 17:11:27 +0000 UTC FieldsV1 {"f:metadata":{"f:annotations":{".":{},"f:kubectl.kubernetes.io/last-applied-configuration":{}}},"f:spec":{".":{},"f:resourcePolicy":{".":{},"f:containerPolicies":{}},"f:targetRef":{},"f:updatePolicy":{".":{},"f:updateMode":{}}}} } {recommender Update autoscaling.k8s.io/v1 2023-05-15 17:16:00 +0000 UTC FieldsV1 {"f:status":{".":{},"f:conditions":{},"f:recommendation":{".":{},"f:containerRecommendations":{}}}} }]} {&CrossVersionObjectReference{Kind:Deployment,Name:hamster,APIVersion:apps/v1,} 0xc000597e10 0xc0005610b0 []} {0xc000561188 [{RecommendationProvided True 2023-05-15 17:12:00 +0000 UTC  }]}}
I0515 17:16:33.741189       1 reflector.go:559] k8s.io/autoscaler/vertical-pod-autoscaler/pkg/target/fetcher.go:94: Watch close - *v1.DaemonSet total 6 items received
I0515 17:16:43.942408       1 reflector.go:559] k8s.io/client-go/informers/factory.go:134: Watch close - *v1.LimitRange total 7 items received
I0515 17:17:00.163545       1 handler.go:91] Processing vpa: &{{VerticalPodAutoscaler autoscaling.k8s.io/v1} {hamster-vpa  default  49f80082-26b4-4511-b096-b2e5a477b34d 119147 6 2023-05-15 17:11:27 +0000 UTC <nil> <nil> map[] map[kubectl.kubernetes.io/last-applied-configuration:{"apiVersion":"autoscaling.k8s.io/v1","kind":"VerticalPodAutoscaler","metadata":{"annotations":{},"name":"hamster-vpa","namespace":"default"},"spec":{"resourcePolicy":{"containerPolicies":[{"containerName":"*","controlledResources":["cpu","memory"],"maxAllowed":{"cpu":1,"memory":"500Mi"},"minAllowed":{"cpu":"100m","memory":"50Mi"}}]},"targetRef":{"apiVersion":"apps/v1","kind":"Deployment","name":"hamster"},"updatePolicy":{"updateMode":"Auto"}}}
] [] [] [{kubectl-client-side-apply Update autoscaling.k8s.io/v1 2023-05-15 17:11:27 +0000 UTC FieldsV1 {"f:metadata":{"f:annotations":{".":{},"f:kubectl.kubernetes.io/last-applied-configuration":{}}},"f:spec":{".":{},"f:resourcePolicy":{".":{},"f:containerPolicies":{}},"f:targetRef":{},"f:updatePolicy":{".":{},"f:updateMode":{}}}} } {recommender Update autoscaling.k8s.io/v1 2023-05-15 17:17:00 +0000 UTC FieldsV1 {"f:status":{".":{},"f:conditions":{},"f:recommendation":{".":{},"f:containerRecommendations":{}}}} }]} {&CrossVersionObjectReference{Kind:Deployment,Name:hamster,APIVersion:apps/v1,} 0xc0004112c0 0xc000560390 []} {0xc000560468 [{RecommendationProvided True 2023-05-15 17:12:00 +0000 UTC  }]}}
I0515 17:17:00.846076       1 reflector.go:559] k8s.io/autoscaler/vertical-pod-autoscaler/pkg/target/fetcher.go:94: Watch close - *v1.Deployment total 20 items received
```

Comprobamos las anotaciones de los Pods con el comando `kubectl get pods -o=jsonpath='{.items[0].metadata.annotations}' | jq`:

[![Pod annotations tras asignar los nuevos recursos](/2023/kubernetes/vertical-pod-autoscaler-pod-annotations.png)](/2023/kubernetes/vertical-pod-autoscaler-pod-annotations.png)

Comprobamos los nuevos recursos asignados con el comando `kubectl get pods -o=jsonpath='{.items[0].spec.containers[0].resources}' | jq`:

[![Recursos asignados tras asignar los nuevos recursos](/2023/kubernetes/vertical-pod-autoscaler-pod-resources.png)](/2023/kubernetes/vertical-pod-autoscaler-pod-resources.png)

### Limitaciones
Actualmente el estado del componente se encuentra en estado beta y tiene algunas limitaciones conocidas:
- Cada vez que se actualizan los recursos, los Pods son recreados
- VPA no garantiza que una vez eliminados los Pods estos se puedan recrear (ej. no hay espacio suficiente en el nodepool)
- La escalabilidad vertical no debe utilizarse junto con la escalabilidad horizontal
- Antes de utilizar VPA, debemos comprobar los Admission controllers existentes

### Conclusión
No en todos los casos de uso podemos hacer uso del Horizontal Pod Autoscaler (HPA) para escalar nuestras aplicaciones en clúster Kubernetes, aunque actualmente la escalabilidad vertical disponible en Kubernetes se encuentra en fase beta y tiene algunas limitaciones, creo que en el futuro se hará un mayor uso de ella, ya que combinada con una buena monitorización, una buena configuración del clúster autoscaler y un buen ajuste del tamaño de los nodepools del clúster podremos optimizar de manera muy efectiva los recursos hardware y a su vez los costes de los mismos.

### References
- https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- https://learn.microsoft.com/en-us/azure/aks/vertical-pod-autoscaler
- https://learn.microsoft.com/en-us/azure/aks/vertical-pod-autoscaler#register-the-aks-vpapreview-feature-flag