---
author: "Javi Vela"
title: "Kubernetes: depurando aplicaciones con contenedores efímeros"
summary: >
  Todos nos hemos enfrentado en alguna ocasión a depurar una aplicación que se ejecuta en un contenedor en un clúster Kubernetes. Normalmente (y siguiendo buenas prácticas) estos contenedores utilizan imágenes [distroless](https://github.com/GoogleContainerTools/distroless) (solo continen la aplicación y sus dependencias, no contienen ninguna shell u otros programas)
date: "2022-02-17"
tags: ["Kubernetes", "contenedores", "depurar", "k8s"]
ShowToc: false
draft: false
---
Todos nos hemos enfrentado en alguna ocasión a depurar una aplicación que se ejecuta en un contenedor en un clúster Kubernetes. Normalmente (y siguiendo buenas prácticas) estos contenedores utilizan imágenes [distroless](https://github.com/GoogleContainerTools/distroless) (solo continen la aplicación y sus dependencias, no contienen ninguna shell u otros programas). Algunas de las ventajas de utilizar este tipo de imágenes son:
  - Menor tamaño de imagen
  - Menor vector de ataque
  - Menor tiempo de descarga de la imagen
  - Menor número de dependencias 

Una desventaja es que en caso de necesitar depurar algún comportamiento extraño de la aplicación no sería posible ya que no existe una shell ni ninguna otra herramienta que nos permita depurar la aplicación.

## Contenedores efímeros
Desde la versión 1.16 Kubernetes nos permite utilizar contenedores efímeros (en la versión 1.23 todavía están en estado beta), estos contenedores se añaden al pod que pertenece el contenedor pudiendo compartir los procesos del resto de contenedores que componen el pod.

Los contenedores efímeros tienen unas características especiales:
  - No se pueden reiniciar
  - No se pueden definir que recursos pueden utilizar (CPU y memoria)
  - No se permiten abrir un puerto
  - No se permite configurar ningún probe: Liveness, Readiness y Startup

Utilizando el comando _**kubectl debug**_ podemos crear contenedores efímeros (es necesario que el clúster permita el uso de _EphemeralContainers_):

#### Crea un contenedor efímero y abre una consola remota en el nuevo contedor:
```
  kubectl debug mypod -it --image=busybox
```

#### Crea una copia del pod _mypod_ en un nuevo pod (my-debugger), crea un contenedor efímero y abre una consola remota:
```  
  kubectl debug mypod -it --image=busybox --copy-to=my-debugger
```

#### Crea una copia del pod _mypod_ en un nuevo pod y sustituye la imagen 
```  
  kubectl debug mypod -it --copy-to=my-debugger --image=debian --set-image=app=app:debug,sidecar=sidecar:debug
```

### Pruebas
Vamos a realizar varias pruebas con una aplicación Node.JS y una aplicación .NET. El código podéis encontrarlo en el siguiente repositorio: https://github.com/fjvela/poc-k8s/tree/main/ephemeral-containers

Vamos a desplegarlas las aplicaciones utilizando [minikube](https://minikube.sigs.k8s.io/) y Kubernetes 1.23.1, para ello ejecutamos: **```minikube start  --kubernetes-version=v1.23.1```** (si utilizas una versión anterior deberás incluir el parámetro **```--feature-gates=EphemeralContainers=true```**).

#### Node.JS
1. Desplegamos la aplicación Node.JS: **```kubectl apply -f .\nodejs\ -n demo```** desplegará un Service de tipo cluster IP y un pod controlado a tráves de un deployment
2. Abrimos un puerto al servicio para realizar varias peticiones, cada petición crea un archivo en la ruta /app/requests : **```kubectl port-forward svc/nodejsapp-svc 8000:8000 -n demo```**
3. Intentamos consultar los ficheros que ha creado en cada una de las peticiones del paso anterior **```kubectl exec nodejsapps-766c6db685-bxw8k -it --container nodejsapp -n demo -- ls -la /app/requests```**. Al estar utilizando una imagen distroless no nos es posible poder acceder al sistema de archivos
    ![Error ejecución remota. Comando ls no encontrado](/2022/kubernetes/container_ephemeral_nodejs_noshell.png)
4. Creamos un contenedor efímero: **```kubectl debug -it  nodejsapps-766c6db685-bxw8k --image=busybox -n demo```**:
    - No podemos ver los procesos del contenedor creado previamente **```ps aux```**
      ![Contenedor efímero: resultado ejecución ps aux. No hay procesos del contenedor creado previamente](/2022/kubernetes/container_ephemeral_nodejs_nops.png)
    - No podemos acceder al sistema de archivos del contenedor previamente **```ls -la /proc```**
      ![Contenedor efímero: resultado ejecución ls -la /proc. No hay ningún directorio del contenedor creado previamente](/2022/kubernetes/container_ephemeral_nodejs_files.png)
    - Podemos realizar pruebas de red **```ping google.com```**
      ![Contenedor efímero: resultado ejecución correcta ping google.com](/2022/kubernetes/container_ephemeral_nodejs_ping.png)
5. Creamos un contenedor efímero, copiando el pod existente en uno nuevo: **```kubectl debug -it  nodejsapps-766c6db685-bxw8k --image=busybox  --share-processes --copy-to=mynewpod -n demo```**
    - Podemos ver los procesos del contenedor creado previamente **```ps aux```**
      ![Contenedor efímero: resultado ejecución ps aux. Hay procesos del contenedor creado previamente](/2022/kubernetes/container_ephemeral_nodejs_ps.png)
    - Podemos acceder al sistema de archivos del contenedor previemte **```ls -la /proc/8/root/app/```**
      ![Contenedor efímero: resultado ejecución ls -la /proc. No hay ningún directorio del contenedor creado previamente](/2022/kubernetes/container_ephemeral_nodejs_files.png)
    - Podemos realizar pruebas de red **```ping google.com```**
      ![Contenedor efímero: resultado ejecución correcta ping google.com](/2022/kubernetes/container_ephemeral_nodejs_ping.png)
    - Cuando se realiza la copia del contenedor, no se copian los archivos creados anteriormente
      ![Contenedor efímero: resultado ejecución comando. Hay varios ficheros de peticiones realizaradas al nuevo pod](/2022/kubernetes/container_ephemeral_nodejs_requests_newfiles.png)
    - El nuevo pod no está controlado por el deployment creado previamente por lo que las peticiones realizadas a traves del servicio no son dirigidas hacia el nuevo pod **```kubectl describe pod mynewpod -n demo```**
      ![Resultado ejecución comando](/2022/kubernetes/container_ephemeral_nodejs_describe_pod.png)

#### .NET
1. Desplegamos la aplicación .NET: **```kubectl apply -f .\dotnet\ -n demo```** desplegará un pod controlado por un deployment
2. Creamos un contenedor efímero: **```kubectl debug -it theweather-99bb677cf-lx5h9 --image=fjvela/dotnet-debug-tools:6.0 --share-processes --copy-to=mynewpod -n demo```**:
    - Podemos ver los procesos del contenedor creado previamente **```ps aux```**
      ![Contenedor efímero: resultado ejecución ps aux. Hay procesos del contenedor](/2022/kubernetes/container_ephemeral_dotnet_ps.png)

3.- Ejecutamos el comando **```/tools dotnet-trace ps```**. Lamentablemente dotnet-trace no detecta el proceso por lo que no podemos utilizar las herramientas de depuración de .NET con contenedores efímeros. En el momento de escribir el articulo existe un petición abierta solicitando para dar soporte a esta funcionalidad: https://github.com/dotnet/diagnostics/issues/810
    ![Contenedor efímero: resultado ejecución dotnet-trace ps. No detecta el proceso del contenedor](/2022/kubernetes/container_ephemeral_dotnet_tools_nops.png)


### Referencias
- https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- https://github.com/kubernetes/enhancements/issues/277
- https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- https://github.com/dotnet/diagnostics/issues/810