---
author: "Javi Vela"
title: "Sidecar Containers"
summary: >
    Kubernetes soporta nativamente el patrón Sidecar containers desde la versión 1.33, ayudando así a resolver problemas de orquestación y ciclo de vida entre contenedores.
date: "2025-06-09"
tags: ["Kubernetes", "K8S"]
ShowToc: true
draft: false
---

## Introducción
Cuando trabajamos con contenedores, podemos utilizar diferentes patrones para ejecutar nuestras aplicaciones.

Algunos de ellos son:

- **Sidecar**: Contenedor que extiende funcionalidad (logging, monitoring).
- **Ambassador**: Proxy para comunicaciones externas.
- **Adapter**: Transforma datos para compatibilidad.
- **Init Container**: Crea y configura parte de la aplicación antes de que se ejecute el contenedor del Pod.

En este post vamos a hablar del patrón `sidecar container`. El objetivo de este patrón es que uno o varios contenedores extiendan la funcionalidad principal de otro contenedor.

Imagina que necesitas extraer parte de la información generada por tu aplicación. En vez de incluir esta funcionalidad dentro de tu aplicación, haciéndola más pesada, delegamos este trabajo en otra aplicación que se despliega junto a la tuya, leyendo y extrayendo la información generada.

Desde la versión [Kubernetes 1.28 Planternetes (alpha)](https://Kubernetes.io/blog/2023/08/15/Kubernetes-v1-28-release/#sidecar-init-containers), se soporta la configuración de este patrón de manera nativa, y desde la versión [1.33 Octarine (stable)](https://Kubernetes.io/blog/2025/04/23/Kubernetes-v1-33-release/#stable-sidecar-containers) está disponible de forma estable.

A continuación, mostramos cómo podemos utilizarlo.

## ¿Cómo crear un sidecar container sin utilizar el soporte nativo de Kubernetes?

Antes de que Kubernetes incluyera el soporte nativo de `sidecar containers`, podíamos aplicar el patrón de la siguiente manera:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-with-logger
spec:
  containers:
  - name: web-server
    image: nginx:alpine
    ports:
    - containerPort: 80
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

  volumes:
  - name: shared-logs
    emptyDir: {}
```

Esta manera de utilizar `sidecar containers` en Kubernetes presenta algunos problemas en ciertos casos:

- **Jobs**: el Pod no termina hasta que todos los contenedores finalizan.
- Los contenedores que procesan logs y métricas necesitan un orden específico de ejecución para evitar la pérdida de datos.
- **Service mesh**: necesitan arrancar y estar en funcionamiento antes que el resto de los contenedores para ejecutar tareas relacionadas con el enrutamiento o la seguridad.

## ¿Cómo crear un sidecar container de manera nativa en Kubernetes?
La implementación nativa de `sidecar containers` se ha realizado utilizando la funcionalidad `initContainers`. Para ello, debemos especificar el valor `Always` en la propiedad `restartPolicy` del contenedor (si utilizamos otro valor, Kubernetes no ejecuta los contenedores como `sidecar containers`).

De esta manera, un `sidecar container` puede iniciarse, pararse o reiniciarse sin afectar al resto de contenedores que componen el Pod.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-with-logger
spec:
  initContainers:
  - name: log-reader
    image: busybox
    command: ["sh", "-c"]
    restartPolicy: Always
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
  containers:
  - name: web-server
    image: nginx:alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx

  volumes:
  - name: shared-logs
    emptyDir: {}
```

Definiendo el valor `Always` en la propiedad `restartPolicy`, el contenedor se ejecutará durante todo el ciclo de vida del Pod y nos garantizará el orden correcto de ejecución de cada uno de los contenedores, siendo los definidos en `initContainers` los primeros en ejecutarse.

Cuando se inicia el proceso de finalización del Pod, `kubelet` pospone la finalización de los contenedores definidos en `initContainers` hasta que los contenedores definidos en la propiedad `containers` hayan finalizado, garantizando así hasta el final del ciclo de vida del Pod el funcionamiento de los `sidecar containers`.

## Conclusión
Aunque la implementación mediante `initContainers` y la propiedad `restartPolicy` puede resultar menos intuitiva para definir los `sidecar containers` de nuestro Pod, creo que contar con soporte nativo en Kubernetes simplifica significativamente la aplicación de este patrón, resolviendo los problemas de orquestación entre los contenedores y garantizando su correcto funcionamiento.

## Referencias
- https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/753-sidecar-containers/README.md
- https://kubernetes.io/blog/2015/06/the-distributed-system-toolkit-patterns/
- https://kubernetes.io/blog/2023/08/15/kubernetes-v1-28-release/
- https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
