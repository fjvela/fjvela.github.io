---
author: "Javi Vela"
title: "Contenedores: Desde el kernel hasta la orquestación - runc y containerd"
summary: >
  De los namespaces y cgroups del kernel a la orquestación: entendiendo cómo runc ejecuta contenedores con el estándar OCI y containerd gestiona su ciclo de vida en el ecosistema moderno.
date: "2025-07-07"
tags: ["containers", "kubernetes", "K8S", "linux"]
ShowToc: true
draft: false
---

## Introducción

Continuamos con la segunda parte de "Desde el kernel hasta la orquestación", en este artículo vamos a hablar sobre `runc` y `containerd`.

En el post [Contenedores: Desde el kernel hasta la orquestación - namespaces y control groups (cgroups)](https://blog.javivela.dev/posts/2025/k8s/contenedores-desde-el-kernel-hasta-la-orquestacion-parte-1-cgroups-namespaces/) vimos los pilares fundamentales sobre los que se ejecutan los contenedores: [namespaces](https://blog.javivela.dev/posts/2025/k8s/contenedores-desde-el-kernel-hasta-la-orquestacion-parte-1-cgroups-namespaces/#namespaces-linux) y [cgroups](https://blog.javivela.dev/posts/2025/k8s/contenedores-desde-el-kernel-hasta-la-orquestacion-parte-1-cgroups-namespaces/#cgroups-control-groups) del kernel de Linux.

Estas funcionalidades del sistema operativo permiten el aislamiento de procesos y el control de los recursos utilizados; trabajar con estas tecnologías requiere un conocimiento del kernel y de los comandos de bajo nivel.

`runc` y `containerd` son dos herramientas que actúan como interfaces entre las herramientas de alto nivel y los comandos de bajo nivel, simplificando enormemente el trabajo con contenedores.

Al comienzo, `Docker` integraba toda la funcionalidad en una aplicación monolítica: gestión de imágenes, networking, almacenamiento, ejecución de contenedores... Esta arquitectura presentaba grandes problemas de dependencia, evolución y control por una única empresa.

En 2015 nació la [Open Container Initiative (OCI)](https://opencontainers.org/), su objetivo principal es crear un estándar para el manejo y ejecución de contenedores que hasta el momento estaba dominado por Docker. De esta manera se garantizaba la interoperabilidad entre los diferentes proveedores y permitió crear estándares abiertos para los runtimes de contenedores y el formato de las imágenes, permitiendo así una arquitectura modular y flexible.

Las especificaciones más importantes son las siguientes:

- [Distribution Spec (cómo distribuir las imágenes)](https://github.com/opencontainers/distribution-spec): Define la API REST estándar para la distribución y almacenamiento de imágenes de contenedor, incluyendo operaciones como el envío (push) y la descarga (pull) de imágenes. Esto asegura la interoperabilidad entre diferentes herramientas y registros de imágenes compatibles con OCI.
- [Image Spec (formato de las imágenes)](https://github.com/opencontainers/image-spec): Define el formato de la estructura, almacenamiento y referencia de una imagen, garantizando que la imagen creada pueda ser ejecutada por cualquier runtime que cumpla estándar OCI.
- [Runtime Spec (cómo ejecutar las imágenes)](https://github.com/opencontainers/runtime-spec): Define la interfaz entre el runtime de bajo nivel y las herramientas de alto nivel, de esta manera podemos intercambiar el uso de herramientas como containerd o CRI-O sin realizar ninguna modificación.

`runc` y `containerd` hacen que trabajar con contenedores sea más sencillo, también son la clave para sistemas de orquestación de contenedores como Kubernetes, que pueden utilizar interfaces estándar sin la necesidad de saber los detalles de la implementación del sistema operativo y de las herramientas utilizadas.

Ambas herramientas eran parte de Docker, fueron extraídas y donadas a la [CNCF (Cloud Native Computing Foundation)](https://www.cncf.io/).

## runc

Es una herramienta de línea de comandos escrita en Go que solo puede ejecutarse en Linux. Permite ejecutar aplicaciones contenerizadas siguiendo el estándar definido por la [Open Container Initiative (OCI)](https://opencontainers.org/).

Aunque proporciona un mayor nivel de abstracción respecto a los comandos del kernel, sigue siendo una utilidad de bajo nivel y normalmente es utilizada por herramientas de más alto nivel.

El estándar definido para la ejecución de contenedores se basa en el concepto de [`bundle`](https://github.com/opencontainers/runtime-spec/blob/main/bundle.md), que consiste en un directorio que contiene un archivo `config.json` y un directorio `rootfs (root filesystem)` con el sistema de archivos del contenedor.

El archivo `config.json` define cómo debe ejecutarse el contenedor. Algunos parámetros que proporciona son los siguientes:

- **process**: Define qué comando ejecutar, el usuario, las variables de entorno y las capacidades.
- **root**: Especifica la ruta al sistema de archivos raíz.
- **mounts**: Lista los puntos de montaje necesarios.
- **linux.namespaces**: Configura el aislamiento mediante namespaces.
- **linux.resources**: Establece límites de recursos.

Esta estructura JSON permite que herramientas de alto nivel generen configuraciones complejas.

```json
{
  "ociVersion": "1.2.1",
  "process": {
    "terminal": true,
    "user": {
      "uid": 0,
      "gid": 0
    },
    "args": ["sh"],
    "env": [
      "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      "TERM=xterm"
    ],
    "cwd": "/",
    "capabilities": {
      "bounding": ["CAP_AUDIT_WRITE", "CAP_KILL", "CAP_NET_BIND_SERVICE"],
      "effective": ["CAP_AUDIT_WRITE", "CAP_KILL", "CAP_NET_BIND_SERVICE"],
      "permitted": ["CAP_AUDIT_WRITE", "CAP_KILL", "CAP_NET_BIND_SERVICE"]
    },
    "rlimits": [
      {
        "type": "RLIMIT_NOFILE",
        "hard": 1024,
        "soft": 1024
      }
    ],
    "noNewPrivileges": true
  },
  "root": {
    "path": "rootfs",
    "readonly": true
  },
  "hostname": "runc",
  "mounts": [
    {
      "destination": "/proc",
      "type": "proc",
      "source": "proc"
    },
    {
      "destination": "/dev",
      "type": "tmpfs",
      "source": "tmpfs",
      "options": ["nosuid", "strictatime", "mode=755", "size=65536k"]
    },
    {
      "destination": "/dev/pts",
      "type": "devpts",
      "source": "devpts",
      "options": [
        "nosuid",
        "noexec",
        "newinstance",
        "ptmxmode=0666",
        "mode=0620",
        "gid=5"
      ]
    },
    {
      "destination": "/dev/shm",
      "type": "tmpfs",
      "source": "shm",
      "options": ["nosuid", "noexec", "nodev", "mode=1777", "size=65536k"]
    },
    {
      "destination": "/dev/mqueue",
      "type": "mqueue",
      "source": "mqueue",
      "options": ["nosuid", "noexec", "nodev"]
    },
    {
      "destination": "/sys",
      "type": "sysfs",
      "source": "sysfs",
      "options": ["nosuid", "noexec", "nodev", "ro"]
    },
    {
      "destination": "/sys/fs/cgroup",
      "type": "cgroup",
      "source": "cgroup",
      "options": ["nosuid", "noexec", "nodev", "relatime", "ro"]
    }
  ],
  "linux": {
    "resources": {
      "devices": [
        {
          "allow": false,
          "access": "rwm"
        }
      ]
    },
    "namespaces": [
      {
        "type": "pid"
      },
      {
        "type": "network"
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
        "type": "cgroup"
      }
    ],
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
      "/proc/scsi"
    ],
    "readonlyPaths": [
      "/proc/bus",
      "/proc/fs",
      "/proc/irq",
      "/proc/sys",
      "/proc/sysrq-trigger"
    ]
  }
}
```

Algunos de los comandos que define el estándar [OCI](https://opencontainers.org/) y que `runc` implementa son:

- `events`: muestra eventos del contenedor como notificaciones OOM, estadísticas de uso de CPU, memoria e IO.
- `create`: ejecuta el proceso definido por el usuario en un contenedor creado.
- `delete`: elimina los recursos asociados al contenedor, utilizado frecuentemente con contenedores en modo desacoplado.
- `kill`: envía la señal especificada (por defecto: SIGTERM) al proceso principal del contenedor.
- `start`: inicia el proceso principal.
- `state`: obtiene el estado actual de un contenedor.

`rootfs (root filesystem)` es el sistema de archivos raíz del contenedor. Contiene todos los archivos, librerías y herramientas para que el contenedor pueda ejecutarse.

Una estructura típica del sistema de archivos sería:

```bash
rootfs/
├── bin/           	# Binarios esenciales (sh, ls, cat, etc.)
├── boot/          	# Archivos de arranque (generalmente vacío)
├── dev/           	# Dispositivos (se monta dinámicamente)
├── etc/           	# Configuraciones del sistema
│   ├── passwd     	# Usuarios del contenedor
│   ├── group      	# Grupos del contenedor
│   ├── hosts      	# Resolución local de nombres
│   └── resolv.conf # Configuración DNS
├── home/          	# Directorios de usuarios
├── lib/           	# Bibliotecas compartidas esenciales
├── lib64/         	# Bibliotecas de 64 bits
├── media/         	# Puntos de montaje para medios removibles
├── mnt/           	# Puntos de montaje temporales
├── opt/           	# Paquetes de software opcionales
├── proc/          	# Sistema de archivos virtual (se monta dinámicamente)
├── root/          	# Directorio home del usuario root
├── run/           	# Datos de runtime
├── sbin/          	# Binarios del sistema
├── srv/           	# Datos de servicios
├── sys/           	# Sistema de archivos virtual (se monta dinámicamente)
├── tmp/           	# Archivos temporales
├── usr/           	# Programas y datos de usuario
│   ├── bin/       	# Binarios de usuario
│   ├── lib/       	# Bibliotecas
│   ├── local/     	# Software local
│   └── share/     	# Datos compartidos
└── var/           	# Datos variables
    ├── log/      	# Logs del sistema
    ├── cache/    	# Cache de aplicaciones
    └── tmp/      	# Archivos temporales adicionales
```

Sistema de archivos de la imagen Alpine:

```bash
rootfs/
├── bin -> /usr/bin
├── etc/
│   ├── alpine-release
│   ├── passwd
│   └── group
├── lib -> /usr/lib
├── sbin -> /usr/sbin
├── usr/
│   ├── bin/
│   │   ├── sh -> /bin/busybox
│   │   ├── ls -> /bin/busybox
│   │   └── cat -> /bin/busybox
│   └── lib/
│       └── libc.musl-x86_64.so.1
└── var/
```

Sistema de archivos de la imagen Ubuntu:

```bash
rootfs/
├── bin/
│   ├── bash
│   ├── sh -> dash
│   └── ls
├── usr/
│   ├── bin/
│   │   ├── python3
│   │   └── apt
│   └── lib/
│       └── x86_64-linux-gnu/
└── lib/
    └── x86_64-linux-gnu/
        ├── libc.so.6
        └── libdl.so.2
```

## containerd

Es un servicio que gestiona el ciclo de vida de los contenedores, implementando los estándares definidos por la [OCI](https://opencontainers.org/).

Actúa como la capa de abstracción entre los orquestadores de contenedores, como Kubernetes, y los runtimes de bajo nivel, como `runc`.

Las funcionalidades principales de `containerd` son:

- **Image service**: Gestiona la descarga, almacenamiento y distribución de imágenes.
  - Pull/Push: Descarga y subida de imágenes desde/hacia registries
  - Gestión de capas: Manejo eficiente de layers con deduplicación
  - Verificación de la integridad de las capas.
  - Recolección de basura (garbage collection).
- **Runtime service**: Gestiona la ejecución de contenedores.
- **Snapshot service**: Gestiona los sistemas de archivos (filesystem) de los contenedores.

Podemos interactuar con el servicio utilizando diferentes herramientas:

- [`ctr`](https://containerd.io/docs/getting-started/cli/): Cliente oficial de bajo nivel para containerd. Permite gestionar imágenes, snapshots y contenedores, principalmente para tareas administrativas y de depuración.
- [`nerdctl`](https://github.com/containerd/nerdctl): Interfaz de línea de comandos compatible con Docker, diseñada para usuarios que buscan una experiencia similar a Docker pero utilizando containerd como backend.
- [`crictl`](https://github.com/kubernetes/cri-tools): Herramienta de línea de comandos para interactuar con runtimes compatibles con el estándar CRI (Container Runtime Interface), utilizada principalmente en entornos Kubernetes para inspeccionar y gestionar contenedores.

La configuración del servicio `containerd` se realiza a través del archivo `/etc/containerd/config.toml`. Este archivo permite ajustar parámetros clave del servicio, como rutas de almacenamiento, plugins habilitados, configuración de red (CNI), integración con runtimes como `runc`, y opciones de seguridad.

Un ejemplo de configuración podría ser:

```toml
version = 3
root = '/var/lib/containerd'
state = '/run/containerd'
temp = ''
disabled_plugins = []
required_plugins = []
oom_score = 0
imports = []

[grpc]
  address = '/run/containerd/containerd.sock'
  tcp_address = ''
  tcp_tls_ca = ''
  tcp_tls_cert = ''
  tcp_tls_key = ''
  uid = 0
  gid = 0
  max_recv_message_size = 16777216
  max_send_message_size = 16777216

[ttrpc]
  address = ''
  uid = 0
  gid = 0

[debug]
  address = ''
  uid = 0
  gid = 0
  level = ''
  format = ''

[metrics]
  address = ''
  grpc_histogram = false

[plugins]
  [plugins.'io.containerd.cri.v1.images']
    snapshotter = 'overlayfs'
    disable_snapshot_annotations = true
    discard_unpacked_layers = false
    max_concurrent_downloads = 3
    concurrent_layer_fetch_buffer = 0
    image_pull_progress_timeout = '5m0s'
    image_pull_with_sync_fs = false
    stats_collect_period = 10
    use_local_image_pull = false

    [plugins.'io.containerd.cri.v1.images'.pinned_images]
      sandbox = 'registry.k8s.io/pause:3.10'

    [plugins.'io.containerd.cri.v1.images'.registry]
      config_path = ''

    [plugins.'io.containerd.cri.v1.images'.image_decryption]
      key_model = 'node'

  [plugins.'io.containerd.cri.v1.runtime']
    enable_selinux = false
    selinux_category_range = 1024
    max_container_log_line_size = 16384
    disable_apparmor = false
    restrict_oom_score_adj = false
    disable_proc_mount = false
    unset_seccomp_profile = ''
    tolerate_missing_hugetlb_controller = true
    disable_hugetlb_controller = true
    device_ownership_from_security_context = false
    ignore_image_defined_volumes = false
    netns_mounts_under_state_dir = false
    enable_unprivileged_ports = true
    enable_unprivileged_icmp = true
    enable_cdi = true
    cdi_spec_dirs = ['/etc/cdi', '/var/run/cdi']
    drain_exec_sync_io_timeout = '0s'
    ignore_deprecation_warnings = []

    [plugins.'io.containerd.cri.v1.runtime'.containerd]
      default_runtime_name = 'runc'
      ignore_blockio_not_enabled_errors = false
      ignore_rdt_not_enabled_errors = false

      [plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes]
        [plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.runc]
          runtime_type = 'io.containerd.runc.v2'
          runtime_path = ''
          pod_annotations = []
          container_annotations = []
          privileged_without_host_devices = false
          privileged_without_host_devices_all_devices_allowed = false
          cgroup_writable = false
          base_runtime_spec = ''
          cni_conf_dir = ''
          cni_max_conf_num = 0
          snapshotter = ''
          sandboxer = 'podsandbox'
          io_type = ''

          [plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.runc.options]
            BinaryName = ''
            CriuImagePath = ''
            CriuWorkPath = ''
            IoGid = 0
            IoUid = 0
            NoNewKeyring = false
            Root = ''
            ShimCgroup = ''

    [plugins.'io.containerd.cri.v1.runtime'.cni]
      bin_dir = ''
      bin_dirs = ['/opt/cni/bin']
      conf_dir = '/etc/cni/net.d'
      max_conf_num = 1
      setup_serially = false
      conf_template = ''
      ip_pref = ''
      use_internal_loopback = false

  [plugins.'io.containerd.differ.v1.erofs']
    mkfs_options = []

  [plugins.'io.containerd.gc.v1.scheduler']
    pause_threshold = 0.02
    deletion_threshold = 0
    mutation_threshold = 100
    schedule_delay = '0s'
    startup_delay = '100ms'

  [plugins.'io.containerd.grpc.v1.cri']
    disable_tcp_service = true
    stream_server_address = '127.0.0.1'
    stream_server_port = '0'
    stream_idle_timeout = '4h0m0s'
    enable_tls_streaming = false

    [plugins.'io.containerd.grpc.v1.cri'.x509_key_pair_streaming]
      tls_cert_file = ''
      tls_key_file = ''

  [plugins.'io.containerd.image-verifier.v1.bindir']
    bin_dir = '/opt/containerd/image-verifier/bin'
    max_verifiers = 10
    per_verifier_timeout = '10s'

  [plugins.'io.containerd.internal.v1.opt']
    path = '/opt/containerd'

  [plugins.'io.containerd.internal.v1.tracing']

  [plugins.'io.containerd.metadata.v1.bolt']
    content_sharing_policy = 'shared'
    no_sync = false

  [plugins.'io.containerd.monitor.container.v1.restart']
    interval = '10s'

  [plugins.'io.containerd.monitor.task.v1.cgroups']
    no_prometheus = false

  [plugins.'io.containerd.nri.v1.nri']
    disable = false
    socket_path = '/var/run/nri/nri.sock'
    plugin_path = '/opt/nri/plugins'
    plugin_config_path = '/etc/nri/conf.d'
    plugin_registration_timeout = '5s'
    plugin_request_timeout = '2s'
    disable_connections = false

  [plugins.'io.containerd.runtime.v2.task']
    platforms = ['linux/arm64/v8']

  [plugins.'io.containerd.service.v1.diff-service']
    default = ['walking']
    sync_fs = false

  [plugins.'io.containerd.service.v1.tasks-service']
    blockio_config_file = ''
    rdt_config_file = ''

  [plugins.'io.containerd.shim.v1.manager']
    env = []

  [plugins.'io.containerd.snapshotter.v1.blockfile']
    root_path = ''
    scratch_file = ''
    fs_type = ''
    mount_options = []
    recreate_scratch = false

  [plugins.'io.containerd.snapshotter.v1.devmapper']
    root_path = ''
    pool_name = ''
    base_image_size = ''
    async_remove = false
    discard_blocks = false
    fs_type = ''
    fs_options = ''

  [plugins.'io.containerd.snapshotter.v1.erofs']
    root_path = ''
    ovl_mount_options = []
    enable_fsverity = false

  [plugins.'io.containerd.snapshotter.v1.native']
    root_path = ''

  [plugins.'io.containerd.snapshotter.v1.overlayfs']
    root_path = ''
    upperdir_label = false
    sync_remove = false
    slow_chown = false
    mount_options = []

  [plugins.'io.containerd.snapshotter.v1.zfs']
    root_path = ''

  [plugins.'io.containerd.tracing.processor.v1.otlp']

  [plugins.'io.containerd.transfer.v1.local']
    max_concurrent_downloads = 3
    concurrent_layer_fetch_buffer = 0
    max_concurrent_uploaded_layers = 3
    check_platform_supported = false
    config_path = ''

[cgroup]
  path = ''

[timeouts]
  'io.containerd.timeout.bolt.open' = '0s'
  'io.containerd.timeout.cri.defercleanup' = '1m0s'
  'io.containerd.timeout.metrics.shimstats' = '2s'
  'io.containerd.timeout.shim.cleanup' = '5s'
  'io.containerd.timeout.shim.load' = '5s'
  'io.containerd.timeout.shim.shutdown' = '3s'
  'io.containerd.timeout.task.state' = '2s'

[stream_processors]
  [stream_processors.'io.containerd.ocicrypt.decoder.v1.tar']
    accepts = ['application/vnd.oci.image.layer.v1.tar+encrypted']
    returns = 'application/vnd.oci.image.layer.v1.tar'
    path = 'ctd-decoder'
    args = ['--decryption-keys-path', '/etc/containerd/ocicrypt/keys']
    env = ['OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf']

  [stream_processors.'io.containerd.ocicrypt.decoder.v1.tar.gzip']
    accepts = ['application/vnd.oci.image.layer.v1.tar+gzip+encrypted']
    returns = 'application/vnd.oci.image.layer.v1.tar+gzip'
    path = 'ctd-decoder'
    args = ['--decryption-keys-path', '/etc/containerd/ocicrypt/keys']
    env = ['OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf']
```

En configuraciones avanzadas, se pueden definir múltiples runtimes, ajustar el driver de almacenamiento (por ejemplo, `overlayfs`), configurar la comunicación por sockets, y personalizar la integración con Kubernetes mediante CRI.

Algunos puntos destacados de la configuración:

- **General**: Define rutas de datos (`root`, `state`), plugins habilitados y parámetros globales.
- **Comunicación y APIs**: Configura los sockets para gRPC y ttrpc, utilizados para la comunicación entre procesos y con los [shims](#containerd-shim).
- **CRI (Container Runtime Interface)**: Permite la integración con Kubernetes, especificando imágenes sandbox, runtimes por defecto y opciones de red.
- **Gestión de imágenes**: Selección del snapshotter (por ejemplo, `overlayfs`), deduplicación de capas y políticas de recolección de basura.
- **Red (CNI)**: Define rutas y parámetros para la configuración de red de los contenedores.
- **Runtimes**: Permite definir y personalizar diferentes runtimes (como `runc`), así como sus opciones específicas.

La flexibilidad de este archivo permite adaptar `containerd` a distintos entornos y necesidades, desde laboratorios hasta despliegues en producción con Kubernetes.

Además de `containerd`, existen otras alternativas para la ejecución de contenedores:

- [CRI-O](https://cri-o.io/): Un runtime ligero diseñado específicamente para Kubernetes. Implementa la especificación [Container Runtime Interface (CRI)](https://kubernetes.io/docs/concepts/architecture/cri/) y utiliza `runc` como runtime de bajo nivel.
- [Docker Engine](https://docs.docker.com/engine/): Plataforma ampliamente utilizada para construir, enviar y ejecutar contenedores. Ofrece gestión de imágenes, redes y volúmenes, y emplea internamente `containerd` y `runc`.
- [Mirantis Container Runtime](https://www.mirantis.com/software/mirantis-container-runtime/): Solución empresarial previamente conocida como Docker Engine - Enterprise, certificada para entornos de producción y con características avanzadas de seguridad y soporte extendido.

### containerd-shim

Para garantizar que los contenedores sigan funcionando incluso si el proceso principal de `containerd` se reinicia o actualiza, existe un componente intermedio llamado **containerd-shim**. 

Este shim se sitúa entre `containerd` y el runtime de bajo nivel (`runc`), y cumple varias funciones clave para ofrecer la gran resiliencia del sistema:

- Permite que los contenedores continúen ejecutándose de forma independiente al proceso principal de `containerd`.
- Gestiona la entrada y salida estándar (stdin, stdout, stderr) de los procesos dentro del contenedor.
- Se encarga de recolectar procesos huérfanos (zombies) para evitar fugas de recursos.
- Propaga señales del sistema operativo (como SIGTERM o SIGKILL) al proceso principal del contenedor.

De este modo, cada contenedor tiene su propio proceso shim, lo que mejora la resiliencia y el aislamiento de los contenedores gestionados por `containerd`.

![Diagrama Kubernetes, containerd, containerd-shim, namespaces, cgroups](/2025/k8s/containers-diagram-containerd-shim.png)

## Ejemplo práctico

Vamos a comprobar la evolución desde comandos del Kernel de Linux hasta las herramientas de alto nivel `runc` y `containerd`.

```bash
sudo unshare --pid --mount --uts --fork /bin/bash
mount -t proc proc /proc
hostname manual-container
ps aux
```

1. El comando `unshare` permite crear nuevos namespaces en Linux, proporcionando una shell de `bash` que se ejecuta de forma aislada, puntos de montaje y hostname, aunque sigue teniendo acceso al sistema de archivos y procesos del host:
    - `--pid`: crea un nuevo namespace de PID, donde los procesos tienen su propio espacio de identificadores, comenzando desde 1.
    - `--mount`: aísla las operaciones de montaje, de modo que los cambios no afectan al host.
    - `--uts`: crea un namespace UTS, permitiendo modificar el hostname y domainname solo dentro del namespace.
    - `--fork`: ejecuta el proceso `/bin/bash` como hijo, haciendo que este sea el proceso principal del nuevo namespace.
2. El comando `mount -t proc proc /proc` monta un sistema de archivos virtual `proc` en el nuevo namespace, mostrando solo los procesos del namespace.
3. El comando `hostname manual-container` cambia el nombre del host dentro del namespace UTS recién creado, sin afectar al sistema principal.

![Resultado ejecución comandos](/2025/k8s/containers-demo-unshare-result.png)

Vamos a utilizar el comando `runc` para obtener el mismo resultado:

```bash
CONTAINER_NAME=manual-container
mkdir $CONTAINER_NAME
cd $CONTAINER_NAME

sudo ctr image pull docker.io/library/alpine:3.22.0

mkdir rootfs

sudo ctr image mount docker.io/library/alpine:3.22.0 rootfs

runc spec

echo $(
  jq '.process.args = ["/bin/sh", "-c", "uname -a && ps aux && sleep 30"]' config.json
) > config.json

sudo runc run $CONTAINER_NAME
```

1. Creamos un directorio para alojar el sistema de archivos `rootfs` y la configuración del contenedor (`config.json`).
2. Descargamos una imagen (por ejemplo, Alpine) para obtener el sistema de archivos base (`rootfs`).
3. Generamos el archivo de configuración `config.json` con el comando `runc spec`.
4. Modificamos el comando de inicio del contenedor para que ejecute `uname -a && ps aux && sleep 30`.
5. Iniciamos el contenedor con `sudo runc run $CONTAINER_NAME`.

![Resultado ejecución comandos runc](/2025/k8s/containers-runc-demo-result.png)

Ejecutamos el contenedor utilizando `containerd`:

```bash
sudo ctr images pull docker.io/library/alpine:3.22.0
sudo ctr run --rm docker.io/library/alpine:3.22.0 manual-container /bin/sh -c "uname -a && ps aux && sleep 30"
```
![Resultado ejecución comandos containerd](/2025/k8s/containers-containerd-demo-result.png)

## Conclusión
La orquestación y ejecución de contenedores no es una tarea trivial. Los `namespaces` y `cgroups` del kernel de Linux proporcionan el aislamiento y control de recursos a bajo nivel. Sobre estos cimientos, herramientas como `runc` y `containerd` añaden una capa de abstracción que facilita la gestión, mejora la experiencia de usuario y habilita funcionalidades avanzadas como la recolección de métricas.

Gracias a la estandarización impulsada por la comunidad y organizaciones como la OCI y la CNCF, hoy disponemos de un ecosistema diverso de herramientas (como gVisor, Kata Containers o CRI-O) que permiten adaptar la ejecución de contenedores a diferentes necesidades y escenarios, desde laboratorios hasta entornos de producción y orquestación con Kubernetes.

Con estas bases sólidas, estamos preparados para el siguiente paso: **Kubernetes**. 

## Referencias

- https://containerd.io/
- https://github.com/containerd/containerd/blob/main/docs/PLUGINS.md
- https://github.com/opencontainers/containerd
- https://github.com/opencontainers/runc
- https://iximiuz.com/en/posts/you-dont-need-an-image-to-run-a-container/
- https://kubernetes.io/docs/setup/production-environment/container-runtimes/
