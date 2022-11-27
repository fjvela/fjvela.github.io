---
author: "Javi Vela"
title: "Algunas noticias de la semana 45"
summary: >
    .NET 6 incluye Parallel.ForEachAsync y la creación de streams en formato JSON. Azure Container APP el nuevo servicio de Azure que integra Dapr y KEDA que permite desplegar aplicaciones contenerizadas sin necesidad de administrar una infraestructura compleja. AKS soporta Secrets Store CSI Driver y nuevas extensiones: Dapr y Azure Machine Learning. Gran cantidad de eventos: Microsoft Ignite, lanzamiento de Visual Studio 2022, .NET Conf 2021.  
description: "Algunas noticias de la semana 45"
date: "2021-11-08"
tags: ["dotnet", "azure", "eventos", "AKS"]
ShowToc: true
draft: false
robotsNoIndex: true
---

## dotnet
### .NET 6 incluye Parallel.ForEachAsync
.NET 6 incluye [Parallel.ForEachAsync](https://docs.microsoft.com/en-us/dotnet/api/system.threading.tasks.parallel.foreachasync?view=net-6.0) y nos permite ejecutar un _for each_ de manera asíncrona.

Leer más:
- https://github.com/dotnet/runtime/issues/1946
- https://www.hanselman.com/blog/parallelforeachasync-in-net-6
- https://twitter.com/okyrylchuk/status/1449838369660362752?s=21

### ASP.NET Core 6 permite crear streams en formato JSON
[IAsyncEnumerable<T>](https://docs.microsoft.com/en-us/archive/msdn-magazine/2019/november/csharp-iterating-with-async-enumerables-in-csharp-8) fue una de las novedades de .NET Core 3 y C# 8, permite iterar sobre una colección de datos sin tener que esperar a que la colección se cargue completamente. Hasta ahora System.Text.JSON no admitía la serialización y deserialización de las instancias de IAsyncEnumerable<T> generando una excepción JsonException.

En .NET Core 6, System.Text.JSON ya serializa y deserializa las instancias de IAsyncEnumerable<T> sin generar excepciones y podemos utilizarlo para crear un stream de datos en formato JSON.

Leer más: https://docs.microsoft.com/es-es/dotnet/core/compatibility/serialization/6.0/iasyncenumerable-serialization
<br/>

## Azure
### Azure Container Apps
Quizá haya sido la novedad de la semana: Azure Container Apps. Permite desplegar aplicaciones contenerizadas sin la necesidad de administrar la infrastructura, además integra [Dapr](https://dapr.io/) para facilitar la interaccion de los diferentes microservicios y [KEDA - Kubernetes Event-Driven Autocaling](https://keda.sh/) que permite escalar dinámicamente los microservicios en función del tráfico HTTP o eventos.

 Leer más: 
- https://azure.microsoft.com/en-us/services/container-apps/ 
- https://techcommunity.microsoft.com/t5/apps-on-azure/introducing-azure-container-apps-a-serverless-container-service/ba-p/2867265
<br/>

### AKS soporta Secrets Store CSI driver
AKS soporta el uso del driver [_Secrets Store CSI (Container Storage Interface)_](ttps://kubernetes-csi.github.io/docs/) y permite montar en un _pod_ información relacionada con secretos, claves, certificados a través de un volumen CSI.  

Leer más: 
- https://azure.microsoft.com/en-us/updates/general-availability-aks-support-for-secrets-store-csi-driver/
- https://docs.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
<br/>

### Nuevas extensiones AKS 
Se ha incluido dos nuevas extensiones para AKS: [Dapr](http://dapr.io) y [Azure Machine Learning](https://azure.microsoft.com/en-us/services/machine-learning/), la instalación y la actualización de estas extensiones se puede realizar a través de [Azure CLI](https://docs.microsoft.com/es-es/cli/azure/install-azure-cli).

Leer más: https://techcommunity.microsoft.com/t5/apps-on-azure/announcing-preview-of-distributed-application-runtime-dapr-and/ba-p/2898250
<br/>

## Eventos
### Microsoft Ignite
Durante los días 2, 3 y 4 de noviembre se ha celebrado Microsoft Ignite, durante estos días Microsoft ha presentado nuevos servicios y actualizaciones de sus productos. Puedes consultar todas las novedades en https://news.microsoft.com/ignite-november-2021-book-of-news/ 

Leer más: https://myignite.microsoft.com/home
<br/>

### Visual Studio 2022 Launch Event
El 8 de noviembre se celebra el evento de lanzamiento de Visual Studio 2022, se darán a conocer todas las novedades de la nueva versión.

Leer más: https://visualstudio.microsoft.com/launch/
<br/>

### .NET Conf 2021
.NET Conf 2021 es el evento del lanzamiento de .NET 6, se celebrará de manera virtual los días 9, 10 y 11 de noviembre:

- **Día 1:** El equipo de .NET contará todas las novedades importantes relacionadas con .NET 6
- **Día 2:** Eventos específicos para contar todos los detalles de .NET 6 
- **Día 3:**: Las comunidades de .NET comenzarán a celebrar eventos locales para contar todas las novedades de .NET 6 en su zona horaria

Leer más: https://www.dotnetconf.net/
<br/>

## Varios
### .NET Tech Community Forums
Microsoft lanza .NET Tech Community Forums, un sitio de preguntas / respuestas donde resolver cualquier duda relacionada con .NET. 

Leer más: https://devblogs.microsoft.com/dotnet/introducing-the-net-tech-community-forums/
<br/>

### Dapr ha sido aceptado como CNCF incubating project
En marzo de 2021, Dapr fue propuesto como proyecto de la [CNCF - Cloud Native Computing Foundation](https://www.cnfc.io/) y esta semana ha sido aceptado como [_CNCF incubating project_](https://www.cncf.io/projects/).

Leer más: https://www.cncf.io/blog/2021/11/03/dapr-distributed-application-runtime-joins-cncf-incubator/
<br/>

### Power Fx producto open source
Power Fx es un lenguaje low-code, su sintaxis se basa en formulas MS Excel y facilita la creación de aplicaciones desde [Power Apps](https://powerapps.microsoft.com/). Está integrado con el modelo de inteligencia articial [GPT-3 de OpenAI](https://openai.com/blog/openai-api/) y desde esta semana es un proyecto open source.

Leer más: 
- https://github.com/microsoft/Power-Fx
- https://docs.microsoft.com/en-us/power-platform/power-fx/overview
- https://www.genbeta.com/desarrollo/power-fx-lenguaje-desarrollo-low-code-microsoft-se-convierte-producto-open-source-licencia-mit
<br/>

### Thomas Dohmke nuevo CEO de GitHub
Nat Friedman dejará de ser CEO de GitHub y será reemplazado por Thomas Dohmke (actual CPO).

Leer más: https://github.blog/2021-11-03-thank-you-github/
<br/>