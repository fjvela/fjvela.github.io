---
author: "Javi Vela"
title: "Algunas noticias de la semana 44"
summary: >
    .NET MAUI Community Toolkit acepta contribuciones de la comunidad, fin soporte k8s 1.19, azure functions, Monkey Conf 2021, DaprCon, Github CLI y herramientas testing funcional
date: "2021-11-01"
description: "Algunas noticias de la semana 44"
tags: ["dotnet", "kubernetes", ".NET MAUI", "eventos", "testing", "github"]
ShowToc: true
draft: false
robotsNoIndex: true
---
## .NET MAUI
### .NET MAUI Community Toolkit acepta contribuciones de la comunidad
Microsoft lanzó en agosto la primera versión  [.NET MAUI Community Toolkit](https://devblogs.microsoft.com/dotnet/introducing-the-net-maui-community-toolkit-preview/), desde este mes ya aceptan contribuciones por parte de la comunidad.

Leer más: https://devblogs.microsoft.com/dotnet/contributing-to-net-maui-community-toolkit/
<br/>

## Kubernetes
### Fin soporte k8s 1.19
El pasado 28 de octubre finalizó el periodo de soporte de la versión 1.19 de kubernetes, recuerda que para recibir soporte por parte de los proveedores cloud deberás estar utilizando una versión actualizada. 

Leer más: https://kubernetes.io/releases/patch-releases/#1-19
<br/>

### kubectl 1.23 incluirá un nuevo comando para manejar eventos: 'kubectl events'
La versión 1.23 de [kubectl (kubernetes CLI)](https://kubernetes.io/es/docs/tasks/tools/install-kubectl/) incluirá una primera versión del nuevo comando events. El comando intentará mejorar el manejo de eventos del clúster y solucionará las carencias del comando 'kubectl get events'

Leer más: https://github.com/kubernetes/kubernetes/pull/99557

### Como Linkerd ha impolementado la política de reintentos de peticiones HTTP que contienen body
La semana pasada comentábamos el lanzamiento de [Linkerd 2.21](/es/posts/2021/weekly/weekly-43/#linkerd-221), esta nueva versión incluye una política de reintentos de peticiones HTTP que contienen body. Linkerd nos explica como han realizado esta implementación.

Leer más: https://linkerd.io/2021/10/26/how-linkerd-retries-http-requests-with-bodies/
<br/>

## Azure
### Azure funtions incluye nuevos bindings y triggers
La última versión de Azure SDK incluye nuevos bindings y triggers para [Azure functions](https://docs.microsoft.com/en-us/azure/azure-functions/): 
- [Azure Blob](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob#storage-extension-5x-and-higher)
- [Azure Queue](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue#storage-extension-5x-and-higher)
- [Azure Event Hubs](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-hubs#event-hubs-extension-5x-and-higher)
- [Azure Service Bus](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus#service-bus-extension-5x-and-higher)
- [Azure Event Grid](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid#event-grid-extension-3x-and-higher)

Leer más:  https://azure.microsoft.com/en-us/updates/general-availability-azure-functions-extensions-for-blobs-queues-event-hubs-service-bus-and-event-grid/
<br/>

## Eventos
### Monkey Conf 2021
Cuarta edición de la Monkey Conf, uno de los grandes eventos del año centrado en tecnología C#. Este año se seguirá celebrando online el próximo 1 de diciembre. C4P: https://sessionize.com/monkeyconf2021

Leer más: https://javiersuarezruiz.wordpress.com/2021/10/27/monkey-conf-2021/
<br/>

### DaprCon
Durante los días 19 y 20 de octubre se celebró DaprCon, primer gran evento dedicado exclusivamente a [Dapr](https://dapr.io/)
 
Leer más: 
- https://blog.dapr.io/posts/2021/10/21/thanks-for-a-great-first-daprcon/
- https://blog.dapr.io/posts/2021/10/05/join-us-for-daprcon-october-19th-20th-2021/
- Playlist día 1: https://www.youtube.com/watch?v=7ax-ltJjM58
- Playlist día 2: https://www.youtube.com/watch?v=0y7ne6teHT4
<br/>

## Otros
### GitHub CLI 2.2.0
GitHub libera la versión 2.2.0 de su aplicación de línea de comandos (_CLI - command line interface_), su mayor novedad es que permite gestionar [GitHub Codespaces](https://github.com/features/codespaces).
 
Leer más: https://github.com/cli/cli/releases/tag/v2.2.0
<br/>

### Herramientas testing funcional
[Francisco Moreno](https://twitter.com/morvader) ha compartido en twitter las herramientas de testing funcional que suele utilizar.
- [Mailinator ](https://twitter.com/morvader/status/1452584941674450951)
- [Mailtrap ](https://twitter.com/morvader/status/1452584943322808325)
- [JSonServer ](https://twitter.com/morvader/status/1452584946581790722)
- [Mocky](https://twitter.com/morvader/status/1452584947957567489)
- [Mockbin](https://twitter.com/morvader/status/1452584949488439305)
- [Mockaroo](https://twitter.com/morvader/status/1452584951027838979)
- [Generador DNI](https://twitter.com/morvader/status/1452584952399372289)
- [BugMagnet](https://twitter.com/morvader/status/1452584953930203146)
- [FakeData](https://twitter.com/morvader/status/1452584955490541569)
- [Nimbus](https://twitter.com/morvader/status/1452584956895576064)
- [Exploratory Testing Chrome Extension](https://twitter.com/morvader/status/1452584958434988036)
- [Fiddler](https://twitter.com/morvader/status/1452584959953276929)
- [WebPageTest](https://twitter.com/morvader/status/1452584961463234563)
- [OWASP Zap](https://twitter.com/morvader/status/1452584962893434882)

Leer más: https://twitter.com/morvader/status/1452584938482634757
<br/>