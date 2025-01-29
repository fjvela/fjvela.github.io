---
author: "Javi Vela"
title: "Cosign, Trivy y Kyverno en acción"
summary: >
   En el artículo explico como utilizar Cosign para firmar imágenes Docker mediante Keyless signing, generar información de vulnerabilidades con Trivy, atestar la información con Cosign y, finalmente, mostrar como Kyverno verifica la integridad de la imagen y sus metadatos antes de ejecutarla en un cluster de Kubernetes.
date: "2025-01-29"
tags: ["Image", "Security", "Kubernetes", "K8S"]
ShowToc: true
draft: false
---
> Puedes encontrar el código fuente del post en el siguiente enlace: https://github.com/fjvela/cosign-trivy-kyverno-in-action

## Introducción
Vamos a describir cómo podemos verificar la autenticidad e integridad de una imagen firmada en el proceso de integración continua y cómo verificar un _attestation_ (información verificable sobre la imagen: revisión código fuente, escaneo de vulnerabilidades...) con la información de las vulnerabilidades de la imagen antes de ejecutar la imagen en un cluster Kubernetes.

Para ello vamos a utilizar las siguientes herramientas:
- [Cosign](#cosign)
- [Kyverno](#kyverno)
- [Trivy](#trivy)

### Cosign
Cosign es una herramienta creada por el proyecto [Sigstore](https://www.sigstore.dev/) que nos permite firmar imágenes Docker y otros artefactos software.

Su principal función es proporcionar una forma sencilla y segura de firmar digitalmente software, permitiendo verificar posteriormente su autenticidad e integridad.

Las firmas se pueden almacenar junto con las imágenes en un registro de imágenes compatible con [OCI (Open Container Initiative)](https://opencontainers.org/).

Por defecto, Cosign firma los artefactos software utilizando el modo _Keyless_, para ello utiliza Fulcio como entidad certificadora y Rekor como _transparency log_. En caso de que fuera necesario también es posible realizar la firma utilizando nuestro certificado.

Una [_attestation_](https://github.com/in-toto/attestation) es una "declaración" firmada que contiene metadatos sobre la imagen Docker. Pueden incluir información sobre un escaneo de vulnerabilidades de la imagen o información de cómo se ha generado. Estas se almacenan en el registro de imágenes junto con la imagen y pueden ser verificadas por Cosign o por otras herramientas cómo Kyverno.

### Trivy
Trivy es un escáner de seguridad que nos permite escanear diferentes elementos como:
- Imágenes
- Ficheros
- Repositorios Git
- cluster de Kubernetes

Dispone de distintos tipos de escáneres que podemos ejecutar en cualquier momento dentro de nuestros procesos de CI/CD:
- Escaneo de vulnerabilidades (CVEs)
- Paquetes y dependencias (SBOM)
- Configuraciones en el código de infraestructura (IaC)
- Información sensible (contraseñas y secretos)

### Kyverno
Kyverno es gestor de políticas que nos va a permitir validar y/o modificar las peticiones de creación o modificación de los elementos de un cluster de Kubernetes. Para que esto sea posible, Kyverno se configura en el cluster como un [_Admission controller_](https://kyverno.io/docs/introduction/admission-controllers/) para recibir todas las peticiones realizadas a la API de Kubernetes.

Las políticas se definen utilizando YAML, eliminando así la necesidad de aprender lenguajes específicos. Estas políticas permiten verificar si las imágenes han sido firmadas o si los elementos creados en el cluster cumplen con nuestros estándares de calidad y seguridad.

## Generación de la imagen y firma
Para poder continuar instala las siguientes herramientas:
- Docker
- Cosign
- Trivy

> Antes de comenzar con el proceso debes autenticarte en el almacén de imágenes que vayas a utilizar (si usas GitHub: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

1. Generamos nuestra imagen: `docker build . -t ghcr.io/fjvela/blog-demo-image-sign-attestation:1.0.0`
2. Almacenamos la imagen generada en nuestro contenedor de imágenes: `docker push ghcr.io/fjvela/blog-demo-image-sign-attestation:1.0.0`
3. Obtenemos el _digest_ (el valor es único por cada imagen generada y nos aseguramos que estamos firmando la imagen que queremos) de la imagen generada: `docker inspect --format='{{index .RepoDigests}}' ghcr.io/fjvela/blog-demo-image-sign-attestation:1.0.0` 
4. Firmamos la imagen con Cosign `cosign sign ghcr.io/fjvela/blog-demo-image-sign-attestation@sha256:76e0af3bda5badd9b8e9772903bfdc8d5e2810f647ea6942e73d913a467c2cff`.


Cuando ejecutamos el comando `cosign sign` se ejecutan las siguientes acciones:
- Se verifica nuestra identidad a través de un _Identity provider_.
- Una vez obtenido un _OIDC token_, Cosign solicita un certificado (válido durante 10 minutos) a una entidad certificadora. En este caso a **Fulcio**, el cual emite certificados efímeros basados en identidades OIDC para firmar artefactos de software de forma segura.
- Se firma la imagen con el certificado, se genera un timestamp. A través de la información del timestamp podemos:
  - Demostrar cuándo se creó la firma
  - Ayuda a prevenir ataques de repetición
  - Proporciona una línea temporal auditable de la firma del contenedor
  - Permite decisiones de políticas basadas en tiempo en controladores de admisión como Kyverno 
- Toda la información se almacena en nuestro _container registry_.
- La información sobre el certificado, la firma y el timestamp se envía a Rekor. Rekor es un registro inmutable y transparente (transparency log) que almacena y permite verificar firmas digitales y metadatos de artefactos de software. 

![Diagrama funcionamiento Cosign sign](/2025/k8s/cosign-trivy-kyverno-en-accion-cosign-sign.png)

## Creación informe de vulnerabilidades y attestation
Una vez firmada la imagen, generamos un informe con las vulnerabilidades de la imagen que hemos generado. El siguiente comando nos proporciona el formato necesario para poder crear un _attestation_ utilizando cosign: 

`trivy image --ignore-unfixed --format cosign-vuln --output vuln.json ghcr.io/fjvela/blog-demo-image-sign-attestation@sha256:76e0af3bda5badd9b8e9772903bfdc8d5e2810f647ea6942e73d913a467c2cff`

Creamos el _attestation_ utilizando cosign: 

`cosign attest --type vuln --predicate vuln.json ghcr.io/fjvela/blog-demo-image-sign-attestation@sha256:76e0af3bda5badd9b8e9772903bfdc8d5e2810f647ea6942e73d913a467c2cff`

Puedes consultar los tipos de _attestation_ que puedes incluir en el siguiente enlace: https://docs.sigstore.dev/cosign/verifying/attestation/

Con los siguientes comandos, se puede verificar la firma e información incluida en el _attestation_:
```sh
    cosign verify ghcr.io/fjvela/blog-demo-image-sign-attestation@sha256:76e0af3bda5badd9b8e9772903bfdc8d5e2810f647ea6942e73d913a467c2cff
    cosign verify-attestation --type vuln ghcr.io/fjvela/blog-demo-image-sign-attestation@sha256:76e0af3bda5badd9b8e9772903bfdc8d5e2810f647ea6942e73d913a467c2cff 
```

## Verificación de firma y del escaneo de vulnerabilidades utilizando Kyverno
En el siguiente enlace puedes consultar cómo instalar Kyverno en un cluster Kubernetes: https://kyverno.io/docs/installation/methods. Kyverno se despliega en el cluster cómo un _Admission Controller_, si lo vas a utilizar en producción es importante que revises la siguiente información: https://kyverno.io/docs/introduction/admission-controllers/

Kyverno soporta diferentes tipos de políticas. El tipo _verifyImages_ nos permite realizar comprobaciones sobre las imágenes que se despliegan en nuestro cluster. También dispone de una amplia galería de políticas ya creadas y que nos pueden servir como base para crear nuestras propias políticas.

Partiendo de la política [_Require Image Vulnerability Scans_](https://kyverno.io/policies/other/require-vulnerability-scan/require-vulnerability-scan/):

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-vulnerability-scan
spec:
  validationFailureAction: Audit
  webhookTimeoutSeconds: 10
  failurePolicy: Fail
  rules:
    - name: scan-not-older-than-one-week
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - mutateDigest: false
          imageReferences:
            - "ghcr.io/fjvela/blog-demo-image-sign-attestation*"
          attestors:
            - entries:
                - keyless:
                    subject: "YOUR_EMAIL"
                    issuer: "https://github.com/login/oauth"
                    rekor:
                      url: https://rekor.sigstore.dev
          attestations:
            - type: https://cosign.sigstore.dev/attestation/vuln/v1
              attestors:
                - entries:
                    - keyless:
                        subject: "YOUR_EMAIL"
                        issuer: "https://github.com/login/oauth"
                        rekor:
                          url: https://rekor.sigstore.dev
              conditions:
                - all:
                    - key: "{{ time_since('','{{metadata.scanFinishedOn}}','') }}"
                      operator: LessThanOrEquals
                      value: "1h"
```

## Conclusión
Como has podido comprobar, la combinación de Cosign para la firma digital, Trivy para el análisis de vulnerabilidades y Kyverno para la gestión de políticas de seguridad en Kubernetes, nos proporciona una manera sencilla de comprobar la integridad y autenticidad de las imágenes que desplegamos en un cluster Kubernetes.

La combinación de estas herramientas nos permite:

- Asegurar la integridad y autenticidad de nuestras imágenes mediante firmas digitales
- Detectar vulnerabilidades de seguridad antes del despliegue
- Automatizar la verificación de seguridad durante el despliegue en Kubernetes
- Mantener un registro inmutable de todas las firmas y attestations

## Referencias
- https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- https://docs.sigstore.dev/logging/overview/
- https://github.com/sigstore/fulcio
- https://github.com/sigstore/rekor
- https://kyverno.io/
- https://trivy.dev/latest/
