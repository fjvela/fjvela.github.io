---
author: "Javi Vela"
title: "Azure Managed Identities"
summary: >
    Managed Identities simplifican la gestión de credenciales y la autenticación en Azure. Las aplicaciones pueden acceder de forma segura a otros recursos de Azure sin necesidad de gestionar credenciales de forma manual.
date: "2024-10-03"
tags: ["Azure", "Security", "Microsoft Entra", "Identity"]
ShowToc: true
draft: false
---
> Puedes encontrar el código fuente del post en el siguiente enlace: https://github.com/fjvela/blog-managed-identities

## Introducción
Uno de los grandes retos que tenemos hoy en día es gestionar la información sensible (credenciales, certificados, ...) que nuestras aplicaciones necesitan.

Azure proporciona _Managed Identities_ para simplificar la autenticación necesaria para acceder a los recursos desplegados en Azure como **_Azure Key Vault_**. Puedes comprobar la lista de servicios que soportan la autenticación a través de _Managed Identities_ en el siguiente enlace: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identities-status 

La utilización de _Managed Identities_ tiene algunas ventajas:
- No es necesario utilizar y/o gestionar credenciales
- Permite autenticarnos con cualquier otra aplicación (incluyendo nuestras propias aplicaciones)
- No tiene un coste extra

## Tipos de Managed Identities
Existen dos tipos de _Managed Identities_:
- **_System managed identities_**: Son creadas automáticamente por Azure cuando se crean algunos servicios como máquinas virtuales:
    - Solo se puede utilizar por el servicio que la ha creado
    - Su ciclo de vida está asociado al ciclo de vida del recurso que lo ha creado (si borras el recurso, se borra la _Managed Identity_)
    - Automáticamente se crea un Service Principal en _Microsoft Entra ID_ (directorio activo)
    - Debemos autorizar a qué servicios pueden acceder a la _Managed Identity_
- **_User managed identities_**: Podemos crear un _Managed Identity_ y asignársela a más de una aplicación:
    - Podemos utilizarla en una o varias aplicaciones
    - Debemos autorizar a qué servicios pueden acceder las aplicaciones que usen la _Managed Identity_ creada
    - Automáticamente se crea un Service Principal en _Microsoft Entra ID_ (directorio activo), su ciclo de vida no está asociado al ciclo de vida de la aplicación que lo utiliza

## ¿Cómo funciona?
Antes de explicar como funciona el proceso de creación y funcionamiento de una _managed identity_, debemos conocer qué es _Azure Instance Metadata Service identity (IMDS)_:

- Es un servicio REST interno disponible en la dirección IP: 169.254.169.254
- Proporciona información sobre las instancias de VM en ejecución: Sistema operativo, mantenimientos programados, ...
- También proporciona tokens de autenticación que obtiene de _Microsoft Entra ID_

![Diagrama funcionamiento managed identities](/2024/azure/managed-identities-como-funciona.png "Diagrama funcionamiento managed identities")

1. _Azure Resource Manager_ crea un _service principal_ en _Microsoft Entra ID_ asociado a la _Managed Identity_ creada
2. A continuación _Azure Resource Manager_, actualiza _Azure Instance Metadata Service identity (IMDS)_ proporcionando el ID el service principal y los certificados creados por _Microsoft Entra ID_. Más tarde serán necesarios para poder autenticarse contra _Microsoft Entra ID_ 
3. En este paso, _Azure Resource Manager_ habilita los permisos necesarios para acceder a otros recursos de Azure (Azure RBAC). Por ejemplo, asignar el rol _Key Vault Secrets User_ para poder leer secretos de un _Azure Key Vault_
4. Cuando nuestra aplicación necesita acceder al recurso, se comunica con el _IMDS_, el cual solicita un token de autenticación a Microsoft Entra ID (utilizando el service principal y certificados creados en el paso 2) que será utilizado por la aplicación para poder acceder a otros recursos desplegados en Azure.

## Habilitar una Managed Identity en Azure
Como hemos comentado, exiten dos tipos de _Managed Identites_: **_System managed identities_** y **_User managed identities_**. Vamos a ver como crear y habilitarlas en Azure.

> Una vez creada la managed identity, debemos asignar los permisos correspondientes de acceso.

### System Managed Identity
Para crear un System Managed Identity asociado a un recurso de Azure tan solo debemos seleccionarlo desde el portal y en el menu "Identity", habilitarlo y guardar los cambios realizados.

![Como habilitar System Managed Identity en Azure Functions](/2024/azure/managed-identities-habilitar-system-managed-identity.png "Como habilitar System Managed Identity en Azure Functions")

![System Managed Identity en Azure Functions creada](/2024/azure/managed-identities-system-managed-identity-creada.png "System Managed Identity en Azure Functions creada")


### User Managed Identity
Desde el apartado "Managed Identities" podemos crear _User Managed Identites_, una vez completados los datos requeridos debemos asignar la _managed identity_ al recurso o recursos que harán uso de ella.

![Como crear una User Managed Identity](/2024/azure/managed-identities-crear-user-managed-identity.png "Como crear una User Managed Identity")

![Como asignar una User Managed Identity a una Azure Functions](/2024/azure/managed-identities-asignar-user-managed-identity.png "Como asignar una User Managed Identity a una Azure Functions")

![User Managed Identity asignada a una Azure Functions](/2024/azure/managed-identities-user-managed-identity-asignada.png "User Managed Identity asignada a una Azure Functions")


## Como acceder a un recurso en Azure utilizando una Managed Identity utilizando .NET
Podemos hacer uso de las _Managed Identities_ creadas en Azure a través de los diferentes SDKs disponibles o implementando el código necesario para poder interactuar con el API REST proporcionado por la IMDS y así obtener los tokens de autenticación para acceder a otros recursos de Azure. 

Vamos a describir cómo podemos acceder a un _Azure Key Vault_ utilizando código .NET y la librería [Azure.Identity](https://learn.microsoft.com/en-us/dotnet/api/azure.identity):

1. Crea una proyecto .NET, en este caso hemos creado un proyecto tipo Azure Functions para facilitar su despliegue en Azure 
2. Añade la referencia a la librería Azure.Identity ```dotnet add package Azure.Identity```

Azure.Identity proporciona varias clases que encapsulan la lógica necesaria para poder obtener un token de autenticación de Microsoft Entra ID haciendo uso de la _Managed Identity_ configurada a través de la IMDS:

**_DefaultAzureCredential:_** Intenta realizar la autenticación a través de diferentes mecanismos hasta que consigue conectarse con uno de ellos.
![Diagrama funcionamiento DefaultAzureCredential](/2024/azure/managed-identities-DefaultAzureCredential.png "Diagrama funcionamiento DefaultAzureCredential")

```csharp
var credential = new DefaultAzureCredential();
var client = new SecretClient(new Uri("https://mykv.vault.azure.net/"), credential);
```

**_ChainedTokenCredential:_** Intenta realizar la autenticación a través de la _Managed Identity_. Si no lo consigue, intenta conectarse utilizando a través de Azure CLI

```csharp
var credential = new ChainedTokenCredential();
var client = new SecretClient(new Uri("https://mykv.vault.azure.net/"), credential);
```

**_ManagedIdentityCredential:_** Utiliza la _Managed Identity_ para solicitar el token de autenticación
```csharp
var credential = new ManagedIdentityCredential();
var client = new SecretClient(new Uri("https://mykv.vault.azure.net/"), credential);
```

El código final de nuestra Azure Function es el siguiente:
```csharp
  [Function("GetSecret")]
  public IActionResult GetSecret([HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequest req, 
      [FromQuery] string name,
      [FromQuery] string credentialType)
  {
      _logger.LogInformation("C# HTTP trigger function processed a request.");
      var kvName = _config["KV_NAME"];

      var tokenCredential = GetTokenCredential(credentialType);
      var client = new SecretClient(new Uri($"https://{kvName}.vault.azure.net/"), tokenCredential);

      return new OkObjectResult(client.GetSecret(name));
  }

  private TokenCredential GetTokenCredential(string credentialType)
  {
      switch (credentialType) {
          case "DefaultAzureCredential":
              return new DefaultAzureCredential();
          case "ChainedTokenCredential":
              return new ChainedTokenCredential();
          case "ManagedIdentityCredential":
              return new ManagedIdentityCredential();
      }

      throw new Exception($"The credential type {credentialType} is not valid");
  }
```
A continuación podemos ver el resultado de la ejecución de la Azure Function desde local y desde Azure:

![Resultado ejecución Azure Function desde local](/2024/azure/managed-identities-resultado-ejecucion-local.png "Resultado ejecución Azure Function desde local")

![Resultado ejecución Azure Function desde Azure](/2024/azure/managed-identities-resultado-ejecucion-azure.png "Resultado ejecución Azure Function desde Azure")

## Conclusión
La utilización de _Managed Identities_ no solo simplifica la gestión de credenciales, sino que también mejora significativamente la seguridad de las aplicaciones, al eliminar la necesidad de configurar y guardar secretos en archivos de configuración.

Para los desarrolladores y arquitectos, utilizar _Managed Identities_ debería ser una práctica estándar en la mayoría de los escenarios.

## Referencias
- https://learn.microsoft.com/en-us/training/modules/implement-managed-identities/5-acquire-access-token
- https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview
- https://learn.microsoft.com/en-us/entra/identity-platform/how-applications-are-added
- https://learn.microsoft.com/en-us/azure/postgresql/single-server/how-to-connect-with-managed-identity
- https://learn.microsoft.com/en-us/dotnet/api/overview/azure/identity-readme
- https://learn.microsoft.com/es-es/azure/virtual-machines/instance-metadata-service
