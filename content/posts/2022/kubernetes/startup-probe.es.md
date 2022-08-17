---
author: "Javi Vela"
title: "Kubernetes: Startup probe"
summary: >
    La probe `Startup probe` permite gestionar de una manera mas eficiente el arranque de una aplicación mejorando la disponibilidad de la misma.
date: "2022-08-18"
tags: ["Kubernetes", "contenedores", "k8s"]
ShowToc: false
draft: false
---
Cuando desplegamos una aplicación en Kubernetes debemos informar de su estado al cluster de Kubernetes para que asi pueda saber si la aplicación está funcionando correctamente y así actuar en consecuencia (ej. reiniciar el Pod). Hasta la versión 1.18 Kubernetes disponía de dos probes:

- **Liveness probe**: Comprueba si la aplicación está funcionando correctamente.
- **Readiness probe**: Comprueba si la aplicación puede aceptar tráfico recibido desde un servicio.

Para comprobar el estado de cada probe, kubertenes nos permite utilizar las siguientes acciones:

- **exec**: Ejecuta el comando indicado en el contenedor. Si el resultado del comando es 0, la aplicación está funcionando correctamente.
- **HTTP**: Ejecuta una llamada HTTP GET. Si el código de respuesta está entre 200 y 399, la aplicación está funcionando correctamente.
- **TPC**: Ejecuta una llamada TCP. Si acepta la conexión, la aplicación está funcionando correctamente.
- **gRPC**: ([1.24 - beta](https://kubernetes.io/blog/2022/05/13/grpc-probes-now-in-beta/)) Ejecuta petición [gRPC health](https://github.com/grpc/grpc/blob/master/doc/health-checking.md). El resultado determina si la aplicación está funcionando correctamente.

En cada acción podemos configurar los siguientes parámetros:
- **initialDelaySeconds**: Tiempo de espera antes de la primera ejecución del probe (por defecto 0 segundos).
- **periodSeconds**: Tiempo de espera entre ejecuciones del probe (por defecto 10 segundos).
- **timeoutSeconds**: Tiempo máximo de espera para la ejecución del probe (por defecto 1 segundo).
- **failureThreshold**: Número de ejecuciones fallidas necesarias para que la aplicación se reinicie (por defecto 3).

Para las aplicaciones que necesitan mucho tiempo para arrancar se puede configurar un valor alto para el parámetro **initialDelaySeconds**. Esto no es una buena práctica y en algunas ocasiones no funciona como se espera ya que kubelet no realiza ninguna comprobación hasta que no pasa el tiempo configurado en el parámetro **initialDelaySeconds**.

La versión 1.18 de Kubernetes nos permite configurar un nuevo tipo de probe: `Startup probe`. La configuración de la probe es idéntica a la configuración de las otras probes y permite comprobar si la aplicación ha arrancado correctamente. Una vez que la aplicación ha arrancado correctamente, kubelet comenzará a monitorizar el resto de probes (recuerda que aunque no las configures hay unos valores por defecto).

En el siguiente ejemplo, kubelet comprueba el estado de la probe `Startup probe`cada dos segundos, en el caso de que falle diez veces reiniciaría el contenedor (tiempo total: veinte segundos). En caso de que la aplicación arranque en cinco segundos, kubelet comenzaria a monitorizar las otras probes.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx:latest
    startupProbe:
      httpGet:
        path: /
        port: 80
      periodSeconds: 2
      failureThreshold: 10
    liveness:
        tcpSocket:
            port: 80
        periodSeconds: 2
        failureThreshold: 2
```

### Referencias
- https://Kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-startup-probes
