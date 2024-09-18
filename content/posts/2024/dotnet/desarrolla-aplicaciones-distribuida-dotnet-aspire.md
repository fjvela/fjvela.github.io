---
author: "Javi Vela"
title: "Desarrolla aplicaciones distribuidas con .NET Aspire"
summary: >
    .NET Aspire un framework que agiliza el desarrollo de aplicaciones distribuidas, observables y listas para ser desplegadas en producción.
date: "2024-08-29"
tags: [".NET", "cloud", "Aspire"]
ShowToc: true
draft: false
---
> Post actualizado a .NET Aspire 8.2

## Introducción
Actualmente, gran parte de las aplicaciones que desarrollamos son distribuidas o están diseñadas para desplegarse en la nube.

El desarrollo de este tipo de aplicaciones presenta varios retos. Entre ellos se encuentran la configuración de los entornos de desarrollo, la integración y utilización de servicios en la nube y la tarea de desplegar y orquestar la solución en proveedores como Azure o Amazon Web Services.

Para simplificar este proceso, Microsoft ha creado .NET Aspire, un framework que agiliza el desarrollo de aplicaciones distribuidas, observables y listas para ser desplegadas en producción. Los desarrolladores pueden concentrarse en la lógica de negocio, mientras .NET Aspire se encarga de tareas como la orquestación de servicios y su configuración.

## Orquestación (App Host)
.NET Aspire nos ofrece un conjunto de librerías para poder configurar dependencias de servicios internos y externos de nuestras aplicaciones. Una vez definidas estas dependencias, .NET Aspire se encarga de configurar y/o crear los servicios necesarios para que la aplicación pueda funcionar correctamente. 

Es importante destacar que **.NET Aspire no pretende sustituir a otros sistemas de orquestación de servicios como [Kubernetes](https://kubernetes.io/)**.

Para poder hacer uso de la orquestación de .NET Aspire necesitamos crear un proyecto _AppHost_. En el proyecto podemos definir nuestras aplicaciones, servicios, las dependencias entre ellos para una correcta ejecución de la solución. A continuación podemos ver un ejemplo:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("cache")
    .WithRedisCommander();

var api = builder.AddProject<Api>("api")
    .WithReference(cache);

var web = builder.AddProject<MyWeatherHub>("myweatherhub")
    .WithReference(api)
    .WithExternalHttpEndpoints();

builder.Build().Run();
```

![Diagrama orquestación applicación: Redis, API y myweatherhub](/2024/dotnet/dotnet-aspire-app-host.png)

En el ejemplo y diagrama anteriores podemos ver la definición y dependencias de una solución con tres componentes: caché, API y frontend definido como myweatherhub. Cuando iniciamos la solución, .NET Aspire se encarga de establecer los parámetros de configuración necesarios como _Connection Strings_ o _Service Bindings_, ejecutar cada una de las aplicaciones y servicios en el orden necesario para que el conjunto de la solución arranque y funcione correctamente.

Para definir y configurar los componentes de la solución, .NET Aspire nos ofrece varios tipos recursos:
- **ProjectResource**: Define la dependencia de un projecto .NET, como ASP.NET Core. 
- **ContainerResource**: Dependencia con una imagen Docker.
- **ExecutableResource**: Dependencias con ficheros ejecutables que se deben ejecutar como parte de la solución.

Es importante comentar que .NET Aspire no se limita unicamente a proyectos .NET. Tambien es posible incluir aplicaciones de otras tecnologias como Node.js (Angular, React o Vue) o Python. Podeis consultar mas información en los siguientes enlaces:

- https://learn.microsoft.com/en-us/dotnet/aspire/get-started/build-aspire-apps-with-nodejs
- https://learn.microsoft.com/en-us/dotnet/aspire/get-started/build-aspire-apps-with-python?tabs=bash

## Service defaults
El tipo de proyecto _.NET Aspire service defaults_ nos permite aplicar una configuración común a todos los proyectos de una solución. Simplificando la gestión de elementos como:

- **Telemetría (OpenTelemetry)**: Utilizando OpenTelemetry para recolectar y exportar datos de rastreo y métricas.
- **Health checks**: Monitorización del estado de la aplicación
- **Service Discovery**: Habilitar el servicio _ServiceDiscovery_ (invocación de aplicaciones y servicios por su nombre lógico)
- **Resilience**: Implementación de patrones para mejorar la tolerancia a fallos

Al centralizar las configuraciones en un único lugar, ahorramos tiempo y garantizamos una mayor coherencia en toda la solución.

## Integrations
.NET Aspire integrations facilitan la integración de servicios y plataformas como [Apache Kafka](https://learn.microsoft.com/en-us/dotnet/aspire/messaging/kafka-integration), [Azure Service Bus](https://learn.microsoft.com/en-us/dotnet/aspire/messaging/azure-service-bus-integration) o [PostgreSQL](https://learn.microsoft.com/en-us/dotnet/aspire/database/postgresql-integration) en cualquier aplicación .NET. Sin necesidad de una configuración compleja, estas librerías se integran de forma sencilla, permitiendo conectar con una amplia variedad de servicios externos.

> Podemos hacer uso de .NET Aspire integrations sin necesidad de añadir un proyecto App Host o Service Defaults a la solución.

Para ello:

1. Añadir la referencia del paquete NuGet: `dotnet add Aspire.StackExchange.Redis.OutputCaching`
2. Registrar el componente como servicio de la aplicación: `builder.AddRedisOutputCache("cache");`

La configuración de los componentes se puede realizar a través del fichero `appsettings.json` o utilizando código .NET:

```JSON
{
  "Aspire": {
    "StackExchange": {
      "Redis": {
        "ConfigurationOptions": {
          "ConnectTimeout": 3000,
          "ConnectRetry": 2
        },
        "DisableHealthChecks": true,
        "DisableTracing": false
      }
    }
  }
}
```

```csharp
builder.AddRedisOutputCache(
    "cache",
    static settings => settings.DisableHealthChecks  = true);
```

Por defecto:
- **Proporcionan información sobre su estado de salud (_health checks_)**: Esto permite detectar y solucionar problemas de forma proactiva.
- **Implementan mecanismos de resiliencia (_resiliency_)**: Como reintentos y timeouts, para garantizar la disponibilidad de los servicios.
- **Ofrecen observabilidad y telemetría (_telemetry_)**: Facilitando la monitorización y el diagnóstico de problemas.

## Dashboard
Cuando integramos el framework _.NET Aspire_ en la solución tenemos acceso a un dashboard cuando ejecutamos la solución. Este dashboard nos va a proporcionar la siguiente información:

- **Logs (console logs)**: Muestra los logs que escriben nuestras aplicaciones en consola.
![.NET Aspire Dasboard - console logs](/2024/dotnet/dotnet-aspire-dashboard-console-logs.png)

- **Logs estructurados (structured logs)**: Muestra eventos generados por _OpenTelemetry_: recurso relacionado, fecha, hora, nivel de log, mensaje...
![.NET Aspire Dasboard - structure logs](/2024/dotnet/dotnet-aspire-dashboard-structure-logs.png)

- **Trazas (traces)**: Podemos consultar el flujo de ejecución de cada una de las peticiones que ha recibido la aplicación para detectar posibles cuellos de botella y errores.
![.NET Aspire Dasboard - traces](/2024/dotnet/dotnet-aspire-dashboard-traces.png)

- **Métricas (metrics)**: Esta página muestra las gráficas y datos relacionados con las diferentes métricas (CPU, memoria, peticiones) que genera la aplicación.
![.NET Aspire Dasboard - metrics](/2024/dotnet/dotnet-aspire-dashboard-metrics.png)

## Despliegue
.NET Aspire no solo nos ayuda a desarrollar nuestra solución distribuida, sino que también ofrece diversas herramientas para desplegar nuestra solución en Azure, ya sea desde nuestro entorno de desarrollo o mediante un sistema de CI/CD.

### Azure Container Apps
[_Azure Container Apps_](https://learn.microsoft.com/azure/container-apps/overview) es una plataforma serverless auto gestionada por Azure. Permite ejecutar aplicaciones contenerizadas sin necesidad de preocuparnos de su configuración o su mantenimiento, ya que Azure se encarga de estas tareas.

Para desplegar la solución en _Azure Container Apps_ utilizamos la linea de comandos [`azd (Azure Developer CLI)`](https://learn.microsoft.com/azure/developer/azure-developer-cli/overview). Una vez instalada, ejecutamos los siguientes comandos desde la carpeta de nuestro proyecto _AppHost_:

1. `azd init`: inicializa y configura la solución para ser desplegada. 
2. `azd up`: analiza, genera los fichero con la infrastructura necesaria (bicep), compila y publica las images Docker de las aplicaciones y por último realiza el despliegue completo de la solucion.

![.NET Aspire deploy ACA - pasos comando azd up](/2024/dotnet/dotnet-aspire-deploy-azd-steps.png)
![.NET Aspire deploy ACA - resultado comando azd up](/2024/dotnet/dotnet-aspire-deploy-azd-result.png)

Tras el despliegue, podemos acceder tanto a la aplicación como al dashboard de .NET Aspire.

![.NET Aspire deploy ACA - dashboard y app](/2024/dotnet/dotnet-aspire-deploy-aca-deployed-dashboard.png)
![.NET Aspire deploy ACA - dashboard - traces](/2024/dotnet/dotnet-aspire-deploy-aca-deployed-dashboard-traces.png)

> :warning: Utiliza el comando `azd down` para eliminar toda la infrastructura desplegada en Azure.

### Kubernetes
A través del proyecto open source [_Aspir8_](https://prom3theu5.github.io/aspirational-manifests/getting-started.html) generamos los recursos necesarios para desplegar la solución en un clúster Kubernetes.

Un vez instalada la herramienta _Aspir8_, ejecutamos los siguientes comandos desde la carpeta de nuestro proyecto _AppHost_: 
1. `aspirate init`: inicializa el proyecto
2. `aspirate build`: genera los recusos necesario para desplegar la solucion en un clúster Kubernetes en diferentes formatos como Helm Chart o kustomize.

![.NET Aspire deploy K8S - resultado aspir8](/2024/dotnet/dotnet-aspire-deploy-kubernetes-aspir8-result.png)
![.NET Aspire deploy K8S - resultado aspir8, helm chart](/2024/dotnet/dotnet-aspire-deploy-kubernetes-aspir8-helm-chart.png)

> :warning: Los pasos anteriores no han generado y ni publicado las imagenes Docker de la solucion, debes generar y publicarlas manualmente o debes configurar un sistema de CI/CD en tu repositorio GIT.

## Referencias
- https://learn.microsoft.com/en-gb/training/paths/dotnet-aspire/
- https://learn.microsoft.com/en-us/dotnet/aspire/
- https://youtu.be/NAYeP0KhLZI?si=VhJ9Ob3Jgs7QxE2v&t=2
- https://www.youtube.com/live/dd1Mc5bQZSo?si=TESCzmMwZrdbRb-J&t=108
- https://github.com/dotnet/aspire
- https://github.com/dotnet/tye
- https://prom3theu5.github.io/aspirational-manifests/getting-started.html
- https://github.com/fjvela/letslearn-dotnet-aspire
