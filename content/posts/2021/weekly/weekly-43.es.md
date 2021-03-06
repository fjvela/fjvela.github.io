---
author: "Javi Vela"
title: "Algunas noticias de la semana 43"
summary: "Noticias sobre dotnet, .NET MAUI, kubernetes, eventos" 
date: "2021-10-23"
description: "Algunas noticias de la semana 43"
tags: ["dotnet", "kubernetes", ".NET MAUI", "eventos", "visual studio"]
ShowToc: true
draft: false
---
## dotnet
### Microsoft elimina hot reload en .NET SDK 6
El 20 de octubre Microsoft publicó el siguiente post https://devblogs.microsoft.com/dotnet/update-on-net-hot-reload-progress-and-visual-studio-2022-highlights/ indicando que iba a centrarse a dar soporte a la funcionalidad [hot reload (permite editar el código fuente de tu aplicación mientras se está ejecutando)](https://devblogs.microsoft.com/dotnet/introducing-net-hot-reload/) en Visual Studio 2022. 

Microsoft eliminó la opción hot reload del .NET SDK (pull request https://github.com/dotnet/sdk/pull/22217) por lo que los desarrolladores ya no podrían hacer uso a través de la línea de comandos y pasando a estar disponible únicamente para los desarrolladores que utilicen Visual Studio 2022.

Este cambio no ha sido bien recibido por la comunidad y ha pedido que vuelva a estar incluida en .NET 6 (pull request https://github.com/dotnet/sdk/pull/22262). Finalmente, Microsoft ha vuelto a incluir la funcionalidad y estará disponible en .NET 6 también ha pedido disculpas en el post: https://devblogs.microsoft.com/dotnet/net-hot-reload-support-via-cli
<br/>

### Novedades EF en .NET 6
Entity Framework (EF) introduce varias novedades en su próxima release:
- Uso de tablas temporales en SQL Server
- Nuevos métodos para consultar datos históricos
- Mejoras en la ejecución de actualizaciones de base de datos
- Modelos compilados 
- Mejora rendimiento

Leer más: https://docs.microsoft.com/en-us/ef/core/what-is-new/ef-core-6.0/whatsnew
<br/>

### Ejemplos migración ASP.NET Core 5.0 a 6.0
En el siguiente enlace https://docs.microsoft.com/en-us/aspnet/core/migration/50-to-60-samples?view=aspnetcore-5.0 tienes disponibles varios ejemplos de cómo migrar tu aplicación ASP.NET 5.0 a 6.0 para aprovechar las últimas novedades de ASP.NET Core en tú aplicación.

## .NET MAUI
### LLega Windows subsystem para Android (WSA)
Windows subsytem para Android (WSA) llega para sustituir a los emuladores Android a la hora de depurar nuestras aplicaciones moviles para Android. Su funcionamiento es similar a WSL ([Windows subsystem for linux](https://docs.microsoft.com/en-us/windows/wsl/about)) y mejorará considerablemente la experiencia de los desarrolladores a la hora de depurar y probar aplicaciones Android.

Por el momento solo está disponible a tráves del programa [Windows Insider](https://insider.windows.com/).

Leer más: https://montemagno.com/goodbye-android-emulators-windows-subsytem-for-android-is-here/
<br/>

### Video novedades.NET MAUI Preview 9 
Revisa todas las novedades de la última preview de .NET MAUI de la mano de James Montemagno: https://www.youtube.com/watch?v=BurpEcTsQbU 
<br/>

## Kubernetes 
### CVE-2021-25742: Ingress-NGINX
Si estás utilizando NGINX  como ingress controller en tu clúster kubernetes, deberías actualizar lo antes posible: https://groups.google.com/g/kubernetes-security-announce/c/mT4JJxi9tQY
<br/>

### Linkerd 2.21
Llega la versión 2.21 de Linkerd (service mesh): 
- Políticas de autorización entre servicios
- Políticas de reintentos para petciones HTTP que incluyen body
- Reducción despliegue

Leer más: https://linkerd.io/2021/09/30/announcing-linkerd-2.11
<br/>

## Eventos
### Netcoreconf 2021
Durante los días 9 y 20 de octubre se celebró Netcoreconf 2021. Uno de los eventos técnicos más importantes del año sobre .NET Core, cloud, Xamarin, IA, data o Visual Studio. Este año debido a la pandemia se celebró online, tienes disponibles todas las charlas en su página web: https://netcoreconf.com/
<br/>

### All day devops
All day devops es uno de los mayores eventos mundiales sobre devops, se celebrará el próximo 28 de octubre online y se podrá ver a 180 ponentes hablar sobre: CI/CD, transformación cultural, DevSecOps, gobernanza, infrastructura o SRE.

Leer más: https://www.alldaydevops.com/
<br/>

## Otros
### Visual Studio 2022 renueva su interfaz de usuario
Microsoft ha actualizado la interfaz de usuario en Visual Studio 2022 que será lanzado en las próximas semanas:
- Creación y selección de temas personalizados
- Mejoras en la accesibilidad de la aplicación
- Nuevos colores
- Nueva iconografía

Leer más: https://devblogs.microsoft.com/visualstudio/weve-upgraded-the-ui-in-visual-studio-2022/
<br/>
