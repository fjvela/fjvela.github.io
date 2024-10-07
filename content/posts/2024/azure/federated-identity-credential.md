---
author: "Javi Vela"
title: "Azure Federated Identity Credentials"
summary: >
    Azure Federated Identity Credentials simplifican la gestión de credenciales y la autenticación para aplicaciones que no se ejecutan en Azure. Las aplicaciones pueden acceder de forma segura a otros recursos de Azure sin necesidad de gestionar credenciales de forma manual.
date: "2024-10-10"
tags: ["Azure", "Security", "GitHub", "Identity"]
ShowToc: true
draft: false
---
> Puedes encontrar el código fuente del post en el siguiente enlace: https://github.com/fjvela/blog-demo-federated-identity-credential

## Introducción
En el post [Azure Managed Identities](/posts/2024/azure/managed-identities) revisamos cómo funcionan y cómo podemos utilizar _Managed Identities_. Estas nos permiten autenticarnos contra servicios de Azure u otras aplicaciones desplegadas en Azure sin necesidad de gestionar secretos y/o certificados.

Existen otros escenarios donde las aplicaciones o servicios desplegados fuera de Azure necesitan acceder a recursos desplegados en Azure. 

Rotar y/o guardar secretos o certificados puede ser tedioso, además supone un riesgo para la seguridad ya que cualquiera que disponga de esta información podría acceder a estos servicios.

Las _federated identity credentials_ nos van a permitir autenticar aplicaciones y servicios externos sin necesidad de gestionar secretos o certificados.

## ¿Cómo funciona?
Una _federated identity credential_  permite establecer una relación de confianza entre una **_User managed identity_** y un proveedor de identidad externo (_external identity provider IdP_).

Esta relación va a permitir a Microsoft Identity autenticar a una aplicación externa a través del token recibido y el IdP configurado, generando a su vez otro token que permitirá a la aplicación acceder a los recursos desplegados en Azure.

Una vez creada la _user managed identity_, podemos configurar hasta un máximo de 20 _federated identity credentials_. 

La información necesaria es la siguiente:
- **issuer**: Dirección URL del proveedor de identidades externo (IdP).
- **subject**: Es el identificador de la aplicación externa, el formato depende del proveedor de identidad externo (IdP).
- **audiences**: Indica qué plataforma de identidad de Microsoft debe aceptar el token entrante (por defecto: api://AzureADTokenExchange - el valor depende del entorno cloud utilizado - Fairfax, Mooncake, USNat o USSec).

La combinación de issuer y subject debe ser única en la _user managed identity_.

![Diagrama de funcionamiento federated  identity credential](/2024/azure/federated-identity-credential-como-funciona.png "Diagrama de funcionamiento federated identity credential")

1. La aplicación solicita un token a su proveedor de identidades.
2. La aplicación solicita un token a Microsoft identity platform, utilizando el token generado en el paso 1.
3. Microsoft identity platform valida el token incluido en la petición contra el servicio de validación definido externo registrado. Si el token es válido, se genera un token de autenticación para autenticarse contra otros servicios desplegados en Azure (hay que asignar los permisos necesarios en el servicio).
4. La aplicación utiliza el token generado para acceder a los recursos desplegados en Azure.

## Configurar federated identity credentials (GitHub)
A continuación, vamos a configurar una _federated identity credential_ para permitir que un GitHub workflow pueda acceder a recursos desplegados en Azure.

Desde el menú "Managed Identities" podemos crear una _User Managed Identity_.

![Cómo crear una User Managed Identity](/2024/azure/managed-identities-crear-user-managed-identity.png "Cómo crear una User Managed Identity")

Una vez creada, añadimos una _federated identity credential_:

1. Azure nos da la opción de configuración para diferentes escenarios, en nuestro caso seleccionamos la opción para configurar GitHub.
2. Completamos la información de la organización, repositorio y entidad (entity). En nuestro caso seleccionamos la entidad "branch" e introducimos el nombre del branch que estará autorizado a utilizar los recursos de Azure.
    - No se pueden utilizar _wildcards (*)_.
    - Si necesitamos dar permisos a otros branches, debemos añadir cada uno de ellos.
 
![Cómo añadir federated identity credential](/2024/azure/federated-identity-credential-crear.png "Cómo añadir federated identity credential")

![Cómo configurar GitHub federated identity credential](/2024/azure/federated-identity-credential-gh-configurar.png "Cómo configurar GitHub federated identity credential")

> Una vez creada la user managed identity y configurados los federated identity credentials, debemos asignar los permisos correspondientes de acceso.

![Asignar un rol a la user managed identity](/2024/azure/federated-identity-credential-asignar-role.png "Asignar un rol a la user managed identity")

### Crear GitHub workflow
Para comprobar el correcto funcionamiento de la _federated identity credential_ vamos a crear un GitHub workflow que realiza un login y mostrará la información de la suscripción de Azure.

Para ello vamos a utilizar el GitHub action [Azure login](https://github.com/Azure/login):

```yaml
name: Run Azure Login with OIDC
on: [push]

permissions:
  id-token: write
  contents: read

jobs:
  azure-login:
    runs-on: ubuntu-latest
    steps:
      - name: Azure login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Azure CLI script
        uses: azure/cli@v2
        with:
          azcliversion: latest
          inlineScript: |
            az account show
```
Una vez que el contenido está en el repositorio, la GitHub action se ejecuta cada vez que se añade algo al branch main:
![Resultado ejecución GitHub workflow](/2024/azure/federated-identity-credential-resultado-gh-workflow.png "Resultado ejecución GitHub workflow")

## Conclusión
El uso de _federated identity credentials_ representa un avance significativo en la administración de seguridad y autenticación para aplicaciones y servicios que interactúan con recursos de Azure desde entornos externos.

Algunas de las ventajas de su uso son:
- Seguridad mejorada: No se necesita administrar ni almacenar secretos y certificados, lo que reduce en gran medida el riesgo de que se comprometan las credenciales.
- Administración simplificada: La configuración de _federated identity credentials_ es un proceso simple que reduce la carga administrativa asociada con la rotación y el mantenimiento de secretos.
- Flexibilidad: Permite una integración perfecta con una variedad de proveedores de identidad externos y se adapta a diferentes arquitecturas y requisitos de seguridad.
 
Para los desarrolladores y administradores de sistemas que utilizan Azure, la adopción de esta tecnología puede mejorar significativamente la seguridad de las aplicaciones y al mismo tiempo simplificar el proceso de autenticación y autorización.

## Referencias
- https://learn.microsoft.com/en-gb/entra/identity/managed-identities-azure-resources/
- https://learn.microsoft.com/en-us/entra/workload-id/
- https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure?tabs=azure-portal%2Cwindows#use-the-azure-login-action-with-openid-connect
- https://learn.microsoft.com/en-us/azure/architecture/patterns/federated-identity
- https://github.com/Azure/login
