---
author: "Javi Vela"
title: "Kubernetes Image Volumes"
summary: >
   Image Volumes en Kubernetes permite montar imágenes como volúmenes en un Pod, separando lógicamente las aplicaciones de sus datos estáticos. Esta funcionalidad, introducida en la versión 1.31 y mejorada a estado beta en la 1.33, proporciona mayor flexibilidad y granularidad al configurar nuestras aplicaciones a traves de las propiedades `subPath` y `subPathExpr`.
date: "2025-05-26"
tags: ["Kubernetes", "K8S", "Storage", "Volume"]
ShowToc: true
draft: false
---

## Introducción

La primera versión de Image Volumes fue introducida en la versión 1.31 (Elli) de Kubernetes (puedes consultar toda la información relacionada en el siguiente enlace https://github.com/kubernetes/enhancements/issues/4639 ). 

En la release 1.33 (Octarine) lanzada en abril de 2025, pasa a un estado beta.

Por defecto esta funcionalidad no se encuentra activada ya que no todos los container runtime (CRI) soportan la funcionalidad.

En estos momentos:

- **CRI-O**: soporta la funcionalidad completa.
- **containerd**: todavía no soporta las novedades incluidas en 1.33 (https://github.com/containerd/containerd/pull/11578 ).

En este post resumimos cómo funciona y las mejoras introducidas.

## ¿Qué es Image Volumes?

Image Volumes permite montar una imagen como un volumen en un Pod. Podemos generar una imagen con el contenido estático necesario para la aplicación (configuración, modelos de machine learning, ...), almacenarlos en un container registry y montarlos como un volumen que será utilizado por las aplicaciones.

La gran ventaja es que separamos la lógica de la aplicación y de los datos que necesita la aplicación pudiendo tener procesos de release totalmente diferentes.

## Novedades de Image Volumes en 1.33
La mejora más destacada en esta versión es la capacidad de montar Image Volumes como subdirectorios dentro de un contenedor, lo que proporciona mayor flexibilidad y granularidad al configurar nuestras aplicaciones.

- `subPath`: Permite especificar un subdirectorio estático donde se montará el contenido del volumen.
- `subPathExpr`: Posibilita definir rutas dinámicas utilizando variables de entorno, ideal para configuraciones que requieren personalización por instancia.

Adicionalmente, introduce métricas dedicadas para la supervisión de Image Volumes:

- `kubelet_image_volume_requested_total`: Muestra el total de peticiones image volumes solicitadas.
- `kubelet_image_volume_mounted_succeed_total`: Contabiliza el total de image volumes montadas correctamente.
- `kubelet_image_volume_mounted_errors_total`: Monitoriza el total de image volumes que no se han podido montar.

## Cómo podemos utilizar Image Volumes en un Pod

Utilizaremos [Kind](https://kind.sigs.k8s.io/docs/user/configuration/) para crear un cluster en nuestro y así poder probar Image volumes.

Creamos el siguiente fichero de configuración para habilitar la funcionalidad `ImageVolume` (https://kind.sigs.k8s.io/docs/user/configuration/#feature-gates):

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
featureGates:
  "ImageVolume": true
```

Creamos el cluster: `kind create cluster --config kind-config.yaml`.

Una vez creado el cluster creamos un Pod con un volumen como imagen:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod
spec:
  containers:
    - name: test
      command: ["sleep", "infinity"]
      image: debian
      volumeMounts:
        - name: volume
          mountPath: /volume
  volumes:
    - name: volume
      image:
        reference: quay.io/crio/artifact:v2
        pullPolicy: IfNotPresent
```

Puedes comprobar el contenido de la imagen `quay.io/crio/artifact:v2` utilizando [dive](https://github.com/wagoodman/dive):

![Dive contenido imagen](/2025/k8s/image-volume-dive.png)

Ejecutamos una shell y comprobamos el contenido `kubectl exec pod -it -- sh`:

![Contenido carpeta /volume](/2025/k8s/image-volume-image-content.png)

## Conclusion
Image Volumes ha incorporado rápidamente nuevas funcionalidades como: `subPath`, `subPathExpr` y `métricas` dedicadas en tan solo dos releases (de la 1.31 a la 1.33), encontrándose esta funcionalidad en estado beta.

Esta progresión refleja que hay una necesidad de gestión de volúmenes utilizando contenedores para poder separar y distribuir datos y aplicaciones en imágenes diferentes.

## References
- https://kubernetes.io/blog/2025/04/29/kubernetes-v1-33-image-volume-beta/
- https://kubernetes.io/docs/tasks/configure-pod-container/image-volumes/
- https://github.com/kubernetes/enhancements/issues/4639