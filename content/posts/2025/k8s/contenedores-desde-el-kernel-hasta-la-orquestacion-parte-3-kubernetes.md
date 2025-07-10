---
author: "Javi Vela"
title: "Contenedores: Desde el kernel hasta la orquestación - kubernetes"
summary: >
  TBD
date: "2025-07-21"
tags: ["containers", "kubernetes", "K8S", "linux"]
ShowToc: true
draft: false
---
## Introducción

En la tercera parte de la saga "Desde el kernel hasta la orquestación" nos adentramos en la orquestación de contenedores.

Si todavía no has leído los artículos anteriores, te recomiendo empezar por el primero, donde hablo de *namespaces* (Linux) y *control groups* (cgroups), herramientas de bajo nivel incluidas en el kernel de Linux para aislar procesos y limitar el acceso a los recursos del host: [cgroups y namespaces](https://blog.javivela.dev/p/namespaces-y-control-groups-desde-el-kernel-hasta-la-orquestacion).

En el segundo artículo de la saga, explico cómo herramientas de más alto nivel como `runc` y `containerd` crean una capa de abstracción que permite ejecutar "contenedores" de manera más sencilla y segura: [runc y containerd](https://blog.javivela.dev/p/runc-y-containerd-desde-el-kernel-hasta-la-orquestacion).

En este post voy a explicar cómo Kubernetes interactúa con todas estas herramientas para orquestar contenedores de manera eficiente y escalable.

## Kubernetes

Kubernetes es un orquestador de contenedores que monitoriza su estado y ejecuta las acciones necesarias para mantenerlos en el estado deseado. Permite escalar y actualizar aplicaciones de forma automática, facilitando la orquestación de soluciones complejas.

Kubernetes dispone de dos tipos de nodos:
- **Control Plane**: se encarga de ejecutar los procesos que gestionan y orquestan los contenedores de usuario.
- **Worker**: ejecuta los contenedores de usuario.

En los nodos de tipo *control plane* se ejecutan los procesos críticos de Kubernetes que permiten monitorizar y ejecutar las acciones necesarias para mantener los contenedores en el estado definido. Estos procesos son:
- **etcd**: almacenamiento distribuido de datos clave-valor donde Kubernetes guarda toda la información de estado del clúster.
- **kube-apiserver**: expone la API de Kubernetes y es el punto de entrada para todas las operaciones (ej. crear un Pod o consultar su estado).
- **kube-scheduler**: asigna los pods a los nodos disponibles según las necesidades de recursos y restricciones.
- **kube-controller-manager**: ejecuta los controladores que monitorizan el estado del clúster y realizan acciones para mantener el estado deseado.

En cada nodo de tipo worker se ejecutan dos procesos principales:
- **kubelet**: agente que se encarga de gestionar los pods y contenedores en el nodo, asegurando que se ejecuten correctamente.
- **kube-proxy**: gestiona la red y el balanceo de carga para exponer los servicios de Kubernetes dentro y fuera del clúster.

> Un **Pod** es la unidad más pequeña de despliegue en Kubernetes. Representa uno o varios contenedores que comparten el mismo espacio de red, almacenamiento y configuración. Todos los contenedores de un Pod se ejecutan en el mismo nodo y pueden comunicarse entre sí a través de `localhost`.

El flujo de creación de un Pod en Kubernetes sería el siguiente:
- Cuando un usuario crea un nuevo Pod (uno o más contenedores trabajando entre sí), interactúa con `kube-apiserver`. Una vez procesada la solicitud, `kube-scheduler` decide en qué nodo de tipo worker debe ejecutarse.
- La solicitud es recibida por `kubelet`, que realiza las operaciones necesarias para comenzar la ejecución de los contenedores a través del Container Runtime Interface (CRI).

El siguiente diagrama muestra la arquitectura que vamos a explorar en el post, desde el control plane de Kubernetes hasta los procesos del kernel:

![Diagrama funcionamiento: Kubernetes, CRI, containerd, cgroups y namespaces](/2025/k8s/containers-diagram-cri-containerd.png)

## Container Runtime Interface (CRI)

Una de las principales características de Kubernetes es la interoperabilidad con diferentes runtimes de contenedores. Para lograrlo, Kubernetes define Container Runtime Interface (CRI), un estándar basado en [gRPC](https://grpc.io/) que permite a `kubelet` comunicarse con distintos motores de ejecución de contenedores (como containerd, CRI-O, Docker, etc.) de manera uniforme y desacoplada.

CRI facilita la integración de nuevos runtimes sin necesidad de modificar el código, promoviendo así la flexibilidad y la evolución del ecosistema de contenedores.

Una vez que `kubelet` recibe la petición para ejecutar un nuevo Pod, realiza las siguientes acciones:

- Crear el namespace, cgroups y configurar la red.
- Realizar pull de la imagen o imágenes en caso de que fuera necesario.
- Crear el container
- Ejecutar el container

Para ello, la interfaz proporciona las siguientes interfaces a través de los servicios `RuntimeService` e `ImageService`:

```proto
service RuntimeService {
    // Version returns the runtime name, runtime version, and runtime API version.
    rpc Version(VersionRequest) returns (VersionResponse) {}

    // RunPodSandbox creates and starts a pod-level sandbox. Runtimes must ensure
    // the sandbox is in the ready state on success.
    rpc RunPodSandbox(RunPodSandboxRequest) returns (RunPodSandboxResponse) {}
    // StopPodSandbox stops any running process that is part of the sandbox and
    // reclaims network resources (e.g., IP addresses) allocated to the sandbox.
    // If there are any running containers in the sandbox, they must be forcibly
    // terminated.
    // This call is idempotent, and must not return an error if all relevant
    // resources have already been reclaimed. kubelet will call StopPodSandbox
    // at least once before calling RemovePodSandbox. It will also attempt to
    // reclaim resources eagerly, as soon as a sandbox is not needed. Hence,
    // multiple StopPodSandbox calls are expected.
    rpc StopPodSandbox(StopPodSandboxRequest) returns (StopPodSandboxResponse) {}
    // RemovePodSandbox removes the sandbox. If there are any running containers
    // in the sandbox, they must be forcibly terminated and removed.
    // This call is idempotent, and must not return an error if the sandbox has
    // already been removed.
    rpc RemovePodSandbox(RemovePodSandboxRequest) returns (RemovePodSandboxResponse) {}
    // PodSandboxStatus returns the status of the PodSandbox. If the PodSandbox is not
    // present, returns an error.
    rpc PodSandboxStatus(PodSandboxStatusRequest) returns (PodSandboxStatusResponse) {}
    // ListPodSandbox returns a list of PodSandboxes.
    rpc ListPodSandbox(ListPodSandboxRequest) returns (ListPodSandboxResponse) {}

    // CreateContainer creates a new container in specified PodSandbox
    rpc CreateContainer(CreateContainerRequest) returns (CreateContainerResponse) {}
    // StartContainer starts the container.
    rpc StartContainer(StartContainerRequest) returns (StartContainerResponse) {}
    // StopContainer stops a running container with a grace period (i.e., timeout).
    // This call is idempotent, and must not return an error if the container has
    // already been stopped.
    // The runtime must forcibly kill the container after the grace period is
    // reached.
    rpc StopContainer(StopContainerRequest) returns (StopContainerResponse) {}
    // RemoveContainer removes the container. If the container is running, the
    // container must be forcibly removed.
    // This call is idempotent, and must not return an error if the container has
    // already been removed.
    rpc RemoveContainer(RemoveContainerRequest) returns (RemoveContainerResponse) {}
    // ListContainers lists all containers by filters.
    rpc ListContainers(ListContainersRequest) returns (ListContainersResponse) {}
    // ContainerStatus returns status of the container. If the container is not
    // present, returns an error.
    rpc ContainerStatus(ContainerStatusRequest) returns (ContainerStatusResponse) {}
    // UpdateContainerResources updates ContainerConfig of the container synchronously.
    // If runtime fails to transactionally update the requested resources, an error is returned.
    rpc UpdateContainerResources(UpdateContainerResourcesRequest) returns (UpdateContainerResourcesResponse) {}
    // ReopenContainerLog asks runtime to reopen the stdout/stderr log file
    // for the container. This is often called after the log file has been
    // rotated. If the container is not running, container runtime can choose
    // to either create a new log file and return nil, or return an error.
    // Once it returns error, new container log file MUST NOT be created.
    rpc ReopenContainerLog(ReopenContainerLogRequest) returns (ReopenContainerLogResponse) {}

    // ExecSync runs a command in a container synchronously.
    rpc ExecSync(ExecSyncRequest) returns (ExecSyncResponse) {}
    // Exec prepares a streaming endpoint to execute a command in the container.
    rpc Exec(ExecRequest) returns (ExecResponse) {}
    // Attach prepares a streaming endpoint to attach to a running container.
    rpc Attach(AttachRequest) returns (AttachResponse) {}
    // PortForward prepares a streaming endpoint to forward ports from a PodSandbox.
    rpc PortForward(PortForwardRequest) returns (PortForwardResponse) {}

    // ContainerStats returns stats of the container. If the container does not
    // exist, the call returns an error.
    rpc ContainerStats(ContainerStatsRequest) returns (ContainerStatsResponse) {}
    // ListContainerStats returns stats of all running containers.
    rpc ListContainerStats(ListContainerStatsRequest) returns (ListContainerStatsResponse) {}

    // PodSandboxStats returns stats of the pod sandbox. If the pod sandbox does not
    // exist, the call returns an error.
    rpc PodSandboxStats(PodSandboxStatsRequest) returns (PodSandboxStatsResponse) {}
    // ListPodSandboxStats returns stats of the pod sandboxes matching a filter.
    rpc ListPodSandboxStats(ListPodSandboxStatsRequest) returns (ListPodSandboxStatsResponse) {}

    // UpdateRuntimeConfig updates the runtime configuration based on the given request.
    rpc UpdateRuntimeConfig(UpdateRuntimeConfigRequest) returns (UpdateRuntimeConfigResponse) {}

    // Status returns the status of the runtime.
    rpc Status(StatusRequest) returns (StatusResponse) {}

    // CheckpointContainer checkpoints a container
    rpc CheckpointContainer(CheckpointContainerRequest) returns (CheckpointContainerResponse) {}

    // GetContainerEvents gets container events from the CRI runtime
    rpc GetContainerEvents(GetEventsRequest) returns (stream ContainerEventResponse) {}

    // ListMetricDescriptors gets the descriptors for the metrics that will be returned in ListPodSandboxMetrics.
    // This list should be static at startup: either the client and server restart together when
    // adding or removing metrics descriptors, or they should not change.
    // Put differently, if ListPodSandboxMetrics references a name that is not described in the initial
    // ListMetricDescriptors call, then the metric will not be broadcasted.
    rpc ListMetricDescriptors(ListMetricDescriptorsRequest) returns (ListMetricDescriptorsResponse) {}

    // ListPodSandboxMetrics gets pod sandbox metrics from CRI Runtime
    rpc ListPodSandboxMetrics(ListPodSandboxMetricsRequest) returns (ListPodSandboxMetricsResponse) {}

    // RuntimeConfig returns configuration information of the runtime.
    // A couple of notes:
    // - The RuntimeConfigRequest object is not to be confused with the contents of UpdateRuntimeConfigRequest.
    //   The former is for having runtime tell kubelet what to do, the latter vice versa.
    // - It is the expectation of the kubelet that these fields are static for the lifecycle of the kubelet.
    //   The kubelet will not re-request the RuntimeConfiguration after startup, and CRI implementations should
    //   avoid updating them without a full node reboot.
    rpc RuntimeConfig(RuntimeConfigRequest) returns (RuntimeConfigResponse) {}

    // UpdatePodSandboxResources synchronously updates the PodSandboxConfig with
    // the pod-level resource configuration. This method is called _after_ the
    // kubelet reconfigures the pod-level cgroups.
    // This request is treated as best effort, and failure will not block the
    // kubelet with proceeding with a resize.
    rpc UpdatePodSandboxResources(UpdatePodSandboxResourcesRequest) returns (UpdatePodSandboxResourcesResponse) {}
}
```

```proto
service ImageService {
    // ListImages lists existing images.
    rpc ListImages(ListImagesRequest) returns (ListImagesResponse) {}
    // ImageStatus returns the status of the image. If the image is not
    // present, returns a response with ImageStatusResponse.Image set to
    // nil.
    rpc ImageStatus(ImageStatusRequest) returns (ImageStatusResponse) {}
    // PullImage pulls an image with authentication config.
    rpc PullImage(PullImageRequest) returns (PullImageResponse) {}
    // RemoveImage removes the image.
    // This call is idempotent, and must not return an error if the image has
    // already been removed.
    rpc RemoveImage(RemoveImageRequest) returns (RemoveImageResponse) {}
    // ImageFSInfo returns information of the filesystem that is used to store images.
    rpc ImageFsInfo(ImageFsInfoRequest) returns (ImageFsInfoResponse) {}
}
```

`containerd` permite el uso de plugins para extender su funcionalidad. Existen varios tipos: snapshotter, almacenamiento o interfaces gRPC.

Para habilitar la comunicación entre `kubelet` y containerd, es necesario utilizar el plugin `CRI`.

La configuración de containerd en `/etc/containerd/config.toml` muestra cómo está habilitado el plugin CRI y configurado para usar runc como runtime por defecto:

![Diagrama funcionamiento: Kubernetes, CRI, containerd, cgroups y namespaces](/2025/k8s/containers-containerd-aks.png)

## Pause container

Un Pod puede contener uno o varios contenedores que comparten recursos, configuración y tienen la posibilidad de comunicarse entre sí.

Para poder lograrlo, es necesario que se ejecuten en el mismo namespace y control group. Para ello, introducimos el componente `pause container`.

`pause container` es un componente esencial en Kubernetes. Su función principal es mantener activo el *namespace* y el *control group* asociados a un Pod, incluso si los contenedores fallan o se reinician. De esta manera, varios contenedores comparten el mismo espacio de red y otros recursos.

Es extremadamente ligero (por ejemplo, la imagen `mcr.microsoft.com/oss/kubernetes/pause:3.6` ocupa solo 484 kB). Ejecuta un bucle infinito escrito en C y gestiona señales como:

- **SIGINT/SIGTERM**: señales que indican al proceso que debe finalizar de forma ordenada. El `pause container` las gestiona para permitir una parada controlada del Pod.
- **SIGCHLD**: señal recibida cuando un proceso hijo termina. El `pause container` la maneja para limpiar correctamente los procesos hijos y evitar procesos zombis.

Estas señales permiten que el `pause container` actúe como un proceso init dentro del Pod, gestionando el ciclo de vida de los contenedores y asegurando la correcta recolección de procesos hijos.

En resumen, el `pause container` actúa como el proceso "padre" de todos los contenedores de un Pod, asegurando que los *namespaces* y *cgroups* permanezcan activos mientras el Pod exista. Si los procesos de los contenedores fallan o se reinician, el `pause container` mantiene el entorno aislado y listo para que los nuevos procesos se inicien en el mismo contexto.

## Ejemplo práctico

En el siguiente ejemplo voy a mostrar cómo ver las diferentes jerarquías de procesos, *cgroups* y *namespaces* que se crean cuando ejecutamos un pod en un clúster de Kubernetes.

He desplegado un clúster de Kubernetes en Azure. En el siguiente enlace puedes ver cómo crear uno: https://learn.microsoft.com/en-us/azure/aks/learn/quick-kubernetes-deploy-portal.

Desplegamos el siguiente Pod en el clúster AKS: `kubectl apply -f pod.yaml`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-with-logger
  namespace: develop
spec:
  containers:
  - name: web-server
    image: nginx:alpine
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx

  - name: log-reader
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        if [ -f /logs/access.log ]; then
          tail -n 5 /logs/access.log
        fi
        sleep 10
      done
    volumeMounts:
    - name: shared-logs
      mountPath: /logs
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
  volumes:
  - name: shared-logs
    emptyDir: {}
```

Para poder acceder a la shell del nodo del clúster (sí, con los permisos correctos puedes acceder a la shell del nodo), utilizo el plugin [kubectl node-shell](https://github.com/kvaps/kubectl-node-shell).

El comando `ps --forest -ef` nos proporciona una vista completa del árbol de procesos, mostrando cómo todos los componentes se relacionan jerárquicamente desde systemd hasta nuestros contenedores de aplicación:

![Resultado ejecución comando ps --forest -ef](/2025/k8s/containers-k8s-ps-result.png)

Podemos comprobar que el proceso padre de nuestro contenedor es el PID `14132` (este valor es del ejemplo y puede variar en cada entorno).

Ejecutando el comando `pstree -pa` se muestra la jerarquía de procesos:

- systemd es el proceso raíz
- containerd gestiona el runtime
- containerd-shim-runc-v2 (un proceso por pod)
- pause mantiene los namespaces del pod
- web-server (nginx) / log-reader  son los contenedores de aplicación

Ejecutando el comando `pstree -pa -H 14132 -p 14132 --show-parents` podemos ver claramente la jerarquía de procesos, donde systemd actúa como proceso raíz, containerd gestiona el runtime, y containerd-shim-runc-v2 maneja cada pod individual:

![Resultado ejecución comando pstree -pa -H 14132 -p 14132 --show-parents](/2025/k8s/containers-k8s-pstree.png)

`crictl` es una aplicación de línea de comandos que permite interactuar con la interfaz CRI (Container Runtime Interface). Podemos utilizarla para inspeccionar los contenedores, consultar información o depurar un contenedor.

El comando `crictl pods` nos muestra todos los pods ejecutándose en el nodo, incluyendo tanto nuestro pod `web-with-logger` en el namespace `develop` como los pods del sistema:

![Resultado ejecución comando crictl pods](/2025/k8s/containers-k8s-crictl-pods.png)

El comando `crictl ps --pod bb3b311a34072` podemos ver los contenedores nuestro Pod (no se muestra el pause container).

También nos permite obtener la configuración de todos los Pods que se están ejecutando en un namespace de Kubernetes: `crictl inspectp --namespace develop`.

```json
{
  "info": {
    "cniResult": {
      "DNS": [
        {},
        {}
      ],
      "Interfaces": {
        "eth0": {
          "IPConfigs": [
            {
              "Gateway": "169.254.1.1",
              "IP": "10.244.0.153"
            }
          ],
          "Mac": "",
          "Sandbox": ""
        },
        "lo": {
          "IPConfigs": [
            {
              "Gateway": "",
              "IP": "127.0.0.1"
            },
            {
              "Gateway": "",
              "IP": "::1"
            }
          ],
          "Mac": "00:00:00:00:00:00",
          "Sandbox": "/var/run/netns/cni-d47bdb8a-6641-6cd2-d33e-55eb78bc2407"
        }
      },
      "Routes": [
        {
          "dst": "0.0.0.0/0",
          "gw": "169.254.1.1"
        }
      ]
    },
    "config": {
      "annotations": {
        "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"v1\",\"kind\":\"Pod\",\"metadata\":{\"annotations\":{},\"name\":\"web-with-logger\",\"namespace\":\"develop\"},\"spec\":{\"containers\":[{\"image\":\"nginx:alpine\",\"name\":\"web-server\",\"ports\":[{\"containerPort\":80}],\"resources\":{\"limits\":{\"cpu\":\"500m\",\"memory\":\"128Mi\"},\"requests\":{\"cpu\":\"250m\",\"memory\":\"64Mi\"}},\"volumeMounts\":[{\"mountPath\":\"/var/log/nginx\",\"name\":\"shared-logs\"}]},{\"args\":[\"while true; do\\n  if [ -f /logs/access.log ]; then\\n    tail -n 5 /logs/access.log\\n  fi\\n  sleep 10\\ndone\\n\"],\"command\":[\"sh\",\"-c\"],\"image\":\"busybox\",\"name\":\"log-reader\",\"resources\":{\"limits\":{\"cpu\":\"500m\",\"memory\":\"128Mi\"},\"requests\":{\"cpu\":\"250m\",\"memory\":\"64Mi\"}},\"volumeMounts\":[{\"mountPath\":\"/logs\",\"name\":\"shared-logs\"}]}],\"volumes\":[{\"emptyDir\":{},\"name\":\"shared-logs\"}]}}\n",
        "kubernetes.io/config.seen": "2025-07-09T02:49:07.174514313Z",
        "kubernetes.io/config.source": "api"
      },
      "dns_config": {
        "options": [
          "ndots:5"
        ],
        "searches": [
          "develop.svc.cluster.local",
          "svc.cluster.local",
          "cluster.local",
          "prccjruuh01ejjepvigjrhciqd.ax.internal.cloudapp.net"
        ],
        "servers": [
          "10.0.0.10"
        ]
      },
      "hostname": "web-with-logger",
      "labels": {
        "io.kubernetes.pod.name": "web-with-logger",
        "io.kubernetes.pod.namespace": "develop",
        "io.kubernetes.pod.uid": "f07700a5-b996-4b1a-a3af-5f99ecb29549"
      },
      "linux": {
        "cgroup_parent": "/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-podf07700a5_b996_4b1a_a3af_5f99ecb29549.slice",
        "overhead": {},
        "resources": {
          "cpu_period": 100000,
          "cpu_quota": 100000,
          "cpu_shares": 512,
          "memory_limit_in_bytes": 268435456,
          "unified": {
            "memory.oom.group": "1"
          }
        },
        "security_context": {
          "namespace_options": {
            "pid": 1
          },
          "seccomp": {}
        }
      },
      "log_directory": "/var/log/pods/develop_web-with-logger_f07700a5-b996-4b1a-a3af-5f99ecb29549",
      "metadata": {
        "name": "web-with-logger",
        "namespace": "develop",
        "uid": "f07700a5-b996-4b1a-a3af-5f99ecb29549"
      },
      "port_mappings": [
        {
          "container_port": 80
        }
      ]
    },
    "image": "mcr.microsoft.com/oss/kubernetes/pause:3.6",
    "netNamespaceClosed": false,
    "pid": 14156,
    "processStatus": "running",
    "runtimeHandler": "",
    "runtimeOptions": {
      "binary_name": "/usr/bin/runc",
      "systemd_cgroup": true
    },
    "runtimeSpec": {
      "annotations": {
        "io.kubernetes.cri.container-type": "sandbox",
        "io.kubernetes.cri.sandbox-cpu-period": "100000",
        "io.kubernetes.cri.sandbox-cpu-quota": "100000",
        "io.kubernetes.cri.sandbox-cpu-shares": "512",
        "io.kubernetes.cri.sandbox-id": "bb3b311a34072532d5d8ca35d9c847bde1e67dcec899ebb61db8b0ad3d70d576",
        "io.kubernetes.cri.sandbox-log-directory": "/var/log/pods/develop_web-with-logger_f07700a5-b996-4b1a-a3af-5f99ecb29549",
        "io.kubernetes.cri.sandbox-memory": "268435456",
        "io.kubernetes.cri.sandbox-name": "web-with-logger",
        "io.kubernetes.cri.sandbox-namespace": "develop",
        "io.kubernetes.cri.sandbox-uid": "f07700a5-b996-4b1a-a3af-5f99ecb29549"
      },
      "hostname": "web-with-logger",
      "linux": {
        "cgroupsPath": "kubepods-burstable-podf07700a5_b996_4b1a_a3af_5f99ecb29549.slice:cri-containerd:bb3b311a34072532d5d8ca35d9c847bde1e67dcec899ebb61db8b0ad3d70d576",
        "maskedPaths": [
          "/proc/acpi",
          "/proc/asound",
          "/proc/kcore",
          "/proc/keys",
          "/proc/latency_stats",
          "/proc/timer_list",
          "/proc/timer_stats",
          "/proc/sched_debug",
          "/sys/firmware",
          "/sys/devices/virtual/powercap",
          "/proc/scsi"
        ],
        "namespaces": [
          {
            "type": "pid"
          },
          {
            "type": "ipc"
          },
          {
            "type": "uts"
          },
          {
            "type": "mount"
          },
          {
            "path": "/var/run/netns/cni-d47bdb8a-6641-6cd2-d33e-55eb78bc2407",
            "type": "network"
          }
        ],
        "readonlyPaths": [
          "/proc/bus",
          "/proc/fs",
          "/proc/irq",
          "/proc/sys",
          "/proc/sysrq-trigger"
        ],
        "resources": {
          "cpu": {
            "shares": 2
          },
          "devices": [
            {
              "access": "rwm",
              "allow": false
            }
          ]
        },
        "seccomp": {
          "architectures": [
            "SCMP_ARCH_X86_64",
            "SCMP_ARCH_X86",
            "SCMP_ARCH_X32"
          ],
          "defaultAction": "SCMP_ACT_ERRNO",
          "syscalls": [
            {
              "action": "SCMP_ACT_ALLOW",
              "names": [
                "accept",
                "accept4",
                "access",
                "adjtimex",
                "alarm",
                "bind",
                "brk",
                "cachestat",
                "capget",
                "capset",
                "chdir",
                "chmod",
                "chown",
                "chown32",
                "clock_adjtime",
                "clock_adjtime64",
                "clock_getres",
                "clock_getres_time64",
                "clock_gettime",
                "clock_gettime64",
                "clock_nanosleep",
                "clock_nanosleep_time64",
                "close",
                "close_range",
                "connect",
                "copy_file_range",
                "creat",
                "dup",
                "dup2",
                "dup3",
                "epoll_create",
                "epoll_create1",
                "epoll_ctl",
                "epoll_ctl_old",
                "epoll_pwait",
                "epoll_pwait2",
                "epoll_wait",
                "epoll_wait_old",
                "eventfd",
                "eventfd2",
                "execve",
                "execveat",
                "exit",
                "exit_group",
                "faccessat",
                "faccessat2",
                "fadvise64",
                "fadvise64_64",
                "fallocate",
                "fanotify_mark",
                "fchdir",
                "fchmod",
                "fchmodat",
                "fchmodat2",
                "fchown",
                "fchown32",
                "fchownat",
                "fcntl",
                "fcntl64",
                "fdatasync",
                "fgetxattr",
                "flistxattr",
                "flock",
                "fork",
                "fremovexattr",
                "fsetxattr",
                "fstat",
                "fstat64",
                "fstatat64",
                "fstatfs",
                "fstatfs64",
                "fsync",
                "ftruncate",
                "ftruncate64",
                "futex",
                "futex_requeue",
                "futex_time64",
                "futex_wait",
                "futex_waitv",
                "futex_wake",
                "futimesat",
                "getcpu",
                "getcwd",
                "getdents",
                "getdents64",
                "getegid",
                "getegid32",
                "geteuid",
                "geteuid32",
                "getgid",
                "getgid32",
                "getgroups",
                "getgroups32",
                "getitimer",
                "getpeername",
                "getpgid",
                "getpgrp",
                "getpid",
                "getppid",
                "getpriority",
                "getrandom",
                "getresgid",
                "getresgid32",
                "getresuid",
                "getresuid32",
                "getrlimit",
                "get_robust_list",
                "getrusage",
                "getsid",
                "getsockname",
                "getsockopt",
                "get_thread_area",
                "gettid",
                "gettimeofday",
                "getuid",
                "getuid32",
                "getxattr",
                "inotify_add_watch",
                "inotify_init",
                "inotify_init1",
                "inotify_rm_watch",
                "io_cancel",
                "ioctl",
                "io_destroy",
                "io_getevents",
                "io_pgetevents",
                "io_pgetevents_time64",
                "ioprio_get",
                "ioprio_set",
                "io_setup",
                "io_submit",
                "io_uring_enter",
                "io_uring_register",
                "io_uring_setup",
                "ipc",
                "kill",
                "landlock_add_rule",
                "landlock_create_ruleset",
                "landlock_restrict_self",
                "lchown",
                "lchown32",
                "lgetxattr",
                "link",
                "linkat",
                "listen",
                "listxattr",
                "llistxattr",
                "_llseek",
                "lremovexattr",
                "lseek",
                "lsetxattr",
                "lstat",
                "lstat64",
                "madvise",
                "membarrier",
                "memfd_create",
                "memfd_secret",
                "mincore",
                "mkdir",
                "mkdirat",
                "mknod",
                "mknodat",
                "mlock",
                "mlock2",
                "mlockall",
                "map_shadow_stack",
                "mmap",
                "mmap2",
                "mprotect",
                "mq_getsetattr",
                "mq_notify",
                "mq_open",
                "mq_timedreceive",
                "mq_timedreceive_time64",
                "mq_timedsend",
                "mq_timedsend_time64",
                "mq_unlink",
                "mremap",
                "msgctl",
                "msgget",
                "msgrcv",
                "msgsnd",
                "msync",
                "munlock",
                "munlockall",
                "munmap",
                "name_to_handle_at",
                "nanosleep",
                "newfstatat",
                "_newselect",
                "open",
                "openat",
                "openat2",
                "pause",
                "pidfd_open",
                "pidfd_send_signal",
                "pipe",
                "pipe2",
                "pkey_alloc",
                "pkey_free",
                "pkey_mprotect",
                "poll",
                "ppoll",
                "ppoll_time64",
                "prctl",
                "pread64",
                "preadv",
                "preadv2",
                "prlimit64",
                "process_mrelease",
                "pselect6",
                "pselect6_time64",
                "pwrite64",
                "pwritev",
                "pwritev2",
                "read",
                "readahead",
                "readlink",
                "readlinkat",
                "readv",
                "recv",
                "recvfrom",
                "recvmmsg",
                "recvmmsg_time64",
                "recvmsg",
                "remap_file_pages",
                "removexattr",
                "rename",
                "renameat",
                "renameat2",
                "restart_syscall",
                "rmdir",
                "rseq",
                "rt_sigaction",
                "rt_sigpending",
                "rt_sigprocmask",
                "rt_sigqueueinfo",
                "rt_sigreturn",
                "rt_sigsuspend",
                "rt_sigtimedwait",
                "rt_sigtimedwait_time64",
                "rt_tgsigqueueinfo",
                "sched_getaffinity",
                "sched_getattr",
                "sched_getparam",
                "sched_get_priority_max",
                "sched_get_priority_min",
                "sched_getscheduler",
                "sched_rr_get_interval",
                "sched_rr_get_interval_time64",
                "sched_setaffinity",
                "sched_setattr",
                "sched_setparam",
                "sched_setscheduler",
                "sched_yield",
                "seccomp",
                "select",
                "semctl",
                "semget",
                "semop",
                "semtimedop",
                "semtimedop_time64",
                "send",
                "sendfile",
                "sendfile64",
                "sendmmsg",
                "sendmsg",
                "sendto",
                "setfsgid",
                "setfsgid32",
                "setfsuid",
                "setfsuid32",
                "setgid",
                "setgid32",
                "setgroups",
                "setgroups32",
                "setitimer",
                "setpgid",
                "setpriority",
                "setregid",
                "setregid32",
                "setresgid",
                "setresgid32",
                "setresuid",
                "setresuid32",
                "setreuid",
                "setreuid32",
                "setrlimit",
                "set_robust_list",
                "setsid",
                "setsockopt",
                "set_thread_area",
                "set_tid_address",
                "setuid",
                "setuid32",
                "setxattr",
                "shmat",
                "shmctl",
                "shmdt",
                "shmget",
                "shutdown",
                "sigaltstack",
                "signalfd",
                "signalfd4",
                "sigprocmask",
                "sigreturn",
                "socketcall",
                "socketpair",
                "splice",
                "stat",
                "stat64",
                "statfs",
                "statfs64",
                "statx",
                "symlink",
                "symlinkat",
                "sync",
                "sync_file_range",
                "syncfs",
                "sysinfo",
                "tee",
                "tgkill",
                "time",
                "timer_create",
                "timer_delete",
                "timer_getoverrun",
                "timer_gettime",
                "timer_gettime64",
                "timer_settime",
                "timer_settime64",
                "timerfd_create",
                "timerfd_gettime",
                "timerfd_gettime64",
                "timerfd_settime",
                "timerfd_settime64",
                "times",
                "tkill",
                "truncate",
                "truncate64",
                "ugetrlimit",
                "umask",
                "uname",
                "unlink",
                "unlinkat",
                "utime",
                "utimensat",
                "utimensat_time64",
                "utimes",
                "vfork",
                "vmsplice",
                "wait4",
                "waitid",
                "waitpid",
                "write",
                "writev"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "args": [
                {
                  "index": 0,
                  "op": "SCMP_CMP_NE",
                  "value": 40
                }
              ],
              "names": [
                "socket"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "args": [
                {
                  "index": 0,
                  "op": "SCMP_CMP_EQ",
                  "value": 0
                }
              ],
              "names": [
                "personality"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "args": [
                {
                  "index": 0,
                  "op": "SCMP_CMP_EQ",
                  "value": 8
                }
              ],
              "names": [
                "personality"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "args": [
                {
                  "index": 0,
                  "op": "SCMP_CMP_EQ",
                  "value": 131072
                }
              ],
              "names": [
                "personality"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "args": [
                {
                  "index": 0,
                  "op": "SCMP_CMP_EQ",
                  "value": 131080
                }
              ],
              "names": [
                "personality"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "args": [
                {
                  "index": 0,
                  "op": "SCMP_CMP_EQ",
                  "value": 4294967295
                }
              ],
              "names": [
                "personality"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "names": [
                "process_vm_readv",
                "process_vm_writev",
                "ptrace"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "names": [
                "arch_prctl",
                "modify_ldt"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "names": [
                "chroot"
              ]
            },
            {
              "action": "SCMP_ACT_ALLOW",
              "args": [
                {
                  "index": 0,
                  "op": "SCMP_CMP_MASKED_EQ",
                  "value": 2114060288
                }
              ],
              "names": [
                "clone"
              ]
            },
            {
              "action": "SCMP_ACT_ERRNO",
              "errnoRet": 38,
              "names": [
                "clone3"
              ]
            }
          ]
        }
      },
      "mounts": [
        {
          "destination": "/proc",
          "options": [
            "nosuid",
            "noexec",
            "nodev"
          ],
          "source": "proc",
          "type": "proc"
        },
        {
          "destination": "/dev",
          "options": [
            "nosuid",
            "strictatime",
            "mode=755",
            "size=65536k"
          ],
          "source": "tmpfs",
          "type": "tmpfs"
        },
        {
          "destination": "/dev/pts",
          "options": [
            "nosuid",
            "noexec",
            "newinstance",
            "ptmxmode=0666",
            "mode=0620",
            "gid=5"
          ],
          "source": "devpts",
          "type": "devpts"
        },
        {
          "destination": "/dev/mqueue",
          "options": [
            "nosuid",
            "noexec",
            "nodev"
          ],
          "source": "mqueue",
          "type": "mqueue"
        },
        {
          "destination": "/sys",
          "options": [
            "nosuid",
            "noexec",
            "nodev",
            "ro"
          ],
          "source": "sysfs",
          "type": "sysfs"
        },
        {
          "destination": "/dev/shm",
          "options": [
            "rbind",
            "ro",
            "nosuid",
            "nodev",
            "noexec"
          ],
          "source": "/run/containerd/io.containerd.grpc.v1.cri/sandboxes/bb3b311a34072532d5d8ca35d9c847bde1e67dcec899ebb61db8b0ad3d70d576/shm",
          "type": "bind"
        },
        {
          "destination": "/etc/resolv.conf",
          "options": [
            "rbind",
            "ro",
            "nosuid",
            "nodev",
            "noexec"
          ],
          "source": "/var/lib/containerd/io.containerd.grpc.v1.cri/sandboxes/bb3b311a34072532d5d8ca35d9c847bde1e67dcec899ebb61db8b0ad3d70d576/resolv.conf",
          "type": "bind"
        }
      ],
      "ociVersion": "1.1.0",
      "process": {
        "args": [
          "/pause"
        ],
        "capabilities": {
          "bounding": [
            "CAP_CHOWN",
            "CAP_DAC_OVERRIDE",
            "CAP_FSETID",
            "CAP_FOWNER",
            "CAP_MKNOD",
            "CAP_NET_RAW",
            "CAP_SETGID",
            "CAP_SETUID",
            "CAP_SETFCAP",
            "CAP_SETPCAP",
            "CAP_NET_BIND_SERVICE",
            "CAP_SYS_CHROOT",
            "CAP_KILL",
            "CAP_AUDIT_WRITE"
          ],
          "effective": [
            "CAP_CHOWN",
            "CAP_DAC_OVERRIDE",
            "CAP_FSETID",
            "CAP_FOWNER",
            "CAP_MKNOD",
            "CAP_NET_RAW",
            "CAP_SETGID",
            "CAP_SETUID",
            "CAP_SETFCAP",
            "CAP_SETPCAP",
            "CAP_NET_BIND_SERVICE",
            "CAP_SYS_CHROOT",
            "CAP_KILL",
            "CAP_AUDIT_WRITE"
          ],
          "permitted": [
            "CAP_CHOWN",
            "CAP_DAC_OVERRIDE",
            "CAP_FSETID",
            "CAP_FOWNER",
            "CAP_MKNOD",
            "CAP_NET_RAW",
            "CAP_SETGID",
            "CAP_SETUID",
            "CAP_SETFCAP",
            "CAP_SETPCAP",
            "CAP_NET_BIND_SERVICE",
            "CAP_SYS_CHROOT",
            "CAP_KILL",
            "CAP_AUDIT_WRITE"
          ]
        },
        "cwd": "/",
        "env": [
          "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        ],
        "noNewPrivileges": true,
        "oomScoreAdj": -998,
        "user": {
          "additionalGids": [
            65535
          ],
          "gid": 65535,
          "uid": 65535
        }
      },
      "root": {
        "path": "rootfs",
        "readonly": true
      }
    },
    "runtimeType": "io.containerd.runc.v2",
    "snapshotKey": "bb3b311a34072532d5d8ca35d9c847bde1e67dcec899ebb61db8b0ad3d70d576",
    "snapshotter": "overlayfs"
  },
  "status": {
    "annotations": {
      "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"v1\",\"kind\":\"Pod\",\"metadata\":{\"annotations\":{},\"name\":\"web-with-logger\",\"namespace\":\"develop\"},\"spec\":{\"containers\":[{\"image\":\"nginx:alpine\",\"name\":\"web-server\",\"ports\":[{\"containerPort\":80}],\"resources\":{\"limits\":{\"cpu\":\"500m\",\"memory\":\"128Mi\"},\"requests\":{\"cpu\":\"250m\",\"memory\":\"64Mi\"}},\"volumeMounts\":[{\"mountPath\":\"/var/log/nginx\",\"name\":\"shared-logs\"}]},{\"args\":[\"while true; do\\n  if [ -f /logs/access.log ]; then\\n    tail -n 5 /logs/access.log\\n  fi\\n  sleep 10\\ndone\\n\"],\"command\":[\"sh\",\"-c\"],\"image\":\"busybox\",\"name\":\"log-reader\",\"resources\":{\"limits\":{\"cpu\":\"500m\",\"memory\":\"128Mi\"},\"requests\":{\"cpu\":\"250m\",\"memory\":\"64Mi\"}},\"volumeMounts\":[{\"mountPath\":\"/logs\",\"name\":\"shared-logs\"}]}],\"volumes\":[{\"emptyDir\":{},\"name\":\"shared-logs\"}]}}\n",
      "kubernetes.io/config.seen": "2025-07-09T02:49:07.174514313Z",
      "kubernetes.io/config.source": "api"
    },
    "createdAt": "2025-07-09T02:49:07.541559341Z",
    "id": "bb3b311a34072532d5d8ca35d9c847bde1e67dcec899ebb61db8b0ad3d70d576",
    "labels": {
      "io.kubernetes.pod.name": "web-with-logger",
      "io.kubernetes.pod.namespace": "develop",
      "io.kubernetes.pod.uid": "f07700a5-b996-4b1a-a3af-5f99ecb29549"
    },
    "linux": {
      "namespaces": {
        "options": {
          "ipc": "POD",
          "network": "POD",
          "pid": "CONTAINER",
          "targetId": ""
        }
      }
    },
    "metadata": {
      "attempt": 0,
      "name": "web-with-logger",
      "namespace": "develop",
      "uid": "f07700a5-b996-4b1a-a3af-5f99ecb29549"
    },
    "network": {
      "additionalIps": [],
      "ip": "10.244.0.153"
    },
    "runtimeHandler": "",
    "state": "SANDBOX_READY"
  }
}
```

Entre los datos que nos muestra el comando, podemos observar la propiedad `io.kubernetes.cri.sandbox-log-directory`. Especifica dónde se almacenan los logs. Al explorar este directorio, encontramos los logs individuales de cada contenedor:

![Contenido directorio logs](/2025/k8s/containers-k8s-pod-logs.png)

La carpeta `/proc` contiene el sistema de archivos virtual que almacena información de los procesos que se están ejecutando.

En esta carpeta se encuentra la información sobre los cgroups de nuestro proceso. El comando `cat /proc/14132/cgroup` muestra la ruta donde se almacena la configuración de cgroups:

![Contenido directorio cgroup y cgroup.procs](/2025/k8s/containers-k8s-cgroup-containerd.png)

Podemos observar que todos los procesos iniciados por containerd están dentro de la jerarquía de cgroups de containerd.

A continuación, comprobamos si los límites de memoria y CPU están configurados en los ficheros de configuración de cgroups. Al examinar los archivos de configuración, podemos verificar que los límites de memoria (134217728 bytes = 128Mi) y CPU (50000/100000 = 500m) están correctamente aplicados:

![Configuración limites memoria y CPU del contenedor](/2025/k8s/containers-k8s-cgroups-container-mem-cpu.png)

El comando `systemd-cgls` nos ayuda a visualizar la jerarquía de cgroups de forma gráfica y sencilla. Permite ver cómo están organizados los procesos y recursos dentro de los diferentes grupos de control, facilitando la identificación de los procesos hijos y su relación con los recursos asignados.

![Resultado ejecución comando systemd-cgls directorio cgroups containerd](/2025/k8s/containers-k8s-systemd-cgls-containerd.png)

Por último, y no menos importante, comprobamos la configuración de los namespaces. Recordemos que su objetivo es aislar y compartir los recursos del sistema.

El siguiente script muestra los namespaces configurados para cada uno de los procesos que componen el Pod `web-with-logger (pid 14132)`:

```shell
SHIM_PID=14132
for pid in $(ps --ppid $SHIM_PID --no-headers -o pid); do
    echo "PID $pid namespaces:"
    ls -la /proc/$pid/ns/ | grep -E "(net|pid|uts|ipc)" | awk '{print "  " $9 ": " $11}'
    echo ""
done
```

![Resultado ejecución script namespaces utilizados](/2025/k8s/containers-k8s-list-namespaces.png)

Podemos comprobar que los tres contenedores comparten los siguientes namespaces:

- **ipc**: Permite que los contenedores compartan mecanismos de comunicación entre procesos (IPC), como semáforos y colas de mensajes.
- **net**: Todos los contenedores del Pod comparten la misma pila de red, interfaces y dirección IP, lo que posibilita la comunicación interna mediante `localhost`.
- **uts**: Compartir este namespace permite que todos los contenedores tengan el mismo hostname y nombre de dominio, facilitando la identificación dentro del Pod.

Gracias al uso de namespaces compartidos, los contenedores de un mismo Pod pueden comunicarse y compartir recursos de manera eficiente y segura.

Comprobamos la configuración de red de cada uno de los procesos:

```shell
SHIM_PID=14132
for pid in $(ps --ppid $SHIM_PID --no-headers -o pid); do
    echo "Network interfaces from PID $pid:"
    nsenter -t $pid -n ip addr show eth0 | grep inet
    echo ""
done
```

![Resultado ejecución script interfaz red eth0](/2025/k8s/containers-k8s-namespaces-net-ip.png)

Los tres contenedores utilizan la misma IP, lo que permite la comunicación entre ellos a través de `localhost`.

Comprobamos que los tres contenedores usan el mismo hostname:

```shell
SHIM_PID=14132
for pid in $(ps --ppid $SHIM_PID --no-headers -o pid); do
    hostname=$(nsenter -t $pid -u hostname)
    echo "PID $pid hostname: $hostname"
done
```

![Resultado ejecución script hostname](/2025/k8s/containers-k8s-namespaces-hostname.png)

## Conclusión

*"Any sufficiently advanced technology is indistinguishable from magic"* - Arthur C. Clarke

Parece trivial ejecutar un contenedor o un Pod en Kubernetes, pero la realidad es mucho más compleja.

El comando para ejecutar un contenedor lanza una coreografía perfecta de acciones en un ecosistema de herramientas y abstracciones que hemos explorado en detalle:

- **Primitivas del kernel**: namespaces y cgroups
- **Runtimes de contenedores**: runc y containerd  
- **Interfaces estándar**: CRI y OCI
- **Orquestación de contenedores**: Kubernetes

Este sistema nos permite obtener portabilidad, escalabilidad y tolerancia a fallos, entre otras ventajas. Cada capa resuelve problemas reales y aporta valor a la solución final.

Sin embargo, cuando algo no funciona correctamente, esta misma complejidad puede convertir un problema simple en una pesadilla que requiere conocimiento profundo para poder resolverla.

Ahora sabes qué sucede realmente cuando Kubernetes hace su "magia". Ese conocimiento es poder.

## Referencias

- https://github.com/containerd/containerd/blob/main/docs/cri/architecture.md
- https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- https://github.com/kubernetes/cri-api/blob/master/pkg/apis/runtime/v1/api.proto
- https://github.com/kubernetes/cri-api/blob/master/pkg/apis/services.go
- https://github.com/kubernetes/kubernetes/blob/master/build/pause/linux/pause.c
- https://kubernetes.io/blog/2024/05/01/cri-streaming-explained/
- https://kubernetes.io/docs/concepts/architecture/
- https://kubernetes.io/docs/concepts/overview/components/
- https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/