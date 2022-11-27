---
author: "Javi Vela"
title: "Algunas noticias de la semana 48 y anteriores"
summary: >
  Rendimiento en .NET 5 y 6, dotnet monitor, operador !! en C# 10, gRPC en .NET 6, NuGet 6, SFTP en Azure Blog Storage, nuevas máquinas virtuales, labs para Microsoft Sentinel, Azure Trusted Launch, nuevas versiones de Kubernetes y ContainerD, certificación KCNA, OpenAI, WSL 0.5.2, etc.
date: "2021-11-29"
description: "Algunas noticias de la semana 48 y anteriores"
tags: [".NET", "dotnet", "Kubernetes", "Azure", "WSL"] 
ShowToc: true
draft: false
robotsNoIndex: true
---
## .NET core
**Comparativa de rendimiento** entre .NET 5 y .NET 6 en el proyecto [Fusion](https://github.com/servicetitan/Stl.Fusion).
<br/>
https://alexyakunin.medium.com/net-6-vs-net-5-up-to-40-speedup-ceca9112d298
<!-- #dotnet #microsoft #performance -->

**dotnet monitor** fue añadido en Junio de 2020 como herramienta experimental que nos ayuda a recoger información de diagnóstico de nuestra aplicación: logs, traces, memory dumps, etc. En .NET 6 se ha incluido la primera versión estable.
<br/>
https://devblogs.microsoft.com/dotnet/announcing-dotnet-monitor-in-net-6/
<!-- #dotnet #microsoft #monitor -->

**¿Sabes que puedes comprobar en C# 10 si un argumento es nulo utilizando !!?** Revisa las diferentes maneras de como comprobar si el parámetro de un método es nulo. 
https://www.variablenotfound.com/2021/11/como-evitar-que-entren-argumentos-nulos.html
<!-- #dotnet #microsoft #csharp #arguments -->

**Revisa todas las novedades de gRPC en .NET 6**: HTTP/3, rendimiento, mejoras en el tratamiento de fallos, etc.
<br/>
https://www.youtube.com/watch?v=CXH_jEa8dUw
<!-- #dotnet #microsoft #gRPC -->

**Novedades en .NET 6 para la generación de aplicaciones en un único fichero**: Desde .NET Core 3 puedes generar y distribuir tus aplicaciones .NET Core. .NET 6 incluye nuevas mejoras.
<br/>
https://dotnetcoretutorials.com/2021/11/10/single-file-apps-in-net-6/
<!-- #dotnet #microsoft #build #deploy -->


**.NET 5.0.12 y .NET core 3.1.21** corrección de bugs en:
- [ASP.NET 5.0.12](https://github.com/dotnet/aspnetcore/issues?q=milestone%3A5.0.12++is%3Aclosed+label%3Aservicing-approved+)
- [Entity Framework 5.0.12](https://github.com/dotnet/efcore/issues?q=milestone%3A5.0.12++is%3Aclosed+label%3Aservicing-approved+)
- [ASP.NET 3.1.21](https://github.com/dotnet/aspnetcore/issues?q=milestone%3A3.1.21++is%3Aclosed+label%3Aservicing-approved+)
- [WPF 3.1.21](https://github.com/dotnet/wpf/issues?q=milestone%3A3.1.21++is%3Aclosed+label%3Aservicing-approved+)
<br/>
https://devblogs.microsoft.com/dotnet/november-2021-updates/
<!-- #dotnet #microsoft #updates -->


**Azure Active Directory: un 33% de uso de CPU menor respecto a .NET 5.**
<br/>
https://devblogs.microsoft.com/dotnet/azure-active-directorys-gateway-is-on-net-6-0/
<!-- #dotnet #azure #microsoft #ad #ActiveDirectory -->

**NuGet 6.0 disponible**: mejoras rendimiento, visualización de vulnerabilidades, paquetes obsoletos, etc...
<br/>
https://devblogs.microsoft.com/nuget/announcing-nuget-6/
<!-- #dotnet #microsoft #nuget #packages -->

## Azure
**Ya puedes utilizar tu Azure Blob Storage como servidor SFTP (preview).** 
<br/>
https://docs.microsoft.com/en-us/azure/storage/blobs/secure-file-transfer-protocol-support
<!-- #azure #blob #sftp #microsoft -->

**VM Appplications (preview)** crea tus imágenes personalizadas para utilizar en maquianas virtuales.
<br/>
https://docs.microsoft.com/en-us/azure/virtual-machines/vm-applications
<!-- #azure #virtualmachines #vm #microsoft #applications -->

**Microsoft entra en el top 10 de la lista TOP500** tras el anuncio de la super computadora NDm A100 v4.
<br/>
https://techcommunity.microsoft.com/t5/azure-compute/microsoft-announces-new-ndm-a100-v4-public-ai-supercomputers-and/ba-p/2966848
<!-- #azure #virtualmachines #vm #microsoft #top500 #ia -->

**Disponibles laboratorios para Microsoft Sentinel**
<br/>
https://techcommunity.microsoft.com/t5/microsoft-sentinel-blog/learning-with-the-microsoft-sentinel-training-lab/ba-p/2953403
<!-- #azure #labs #microsoft #sentinel -->

**Disponible Azure Trusted Launch** para todas las máquinas virtuales de 2 generación. Permite detectar infecciones a través de bootkits y rootkits.
<br/>
https://techcommunity.microsoft.com/t5/azure-confidential-computing/announcing-general-availability-of-azure-trusted-launch-for/ba-p/2871755
<!-- #azure #microsoft #TrustedLaunch #secureboot -->

**Azure DCasv5/ECasv5, nuevas máquinas virtuales confidenciales** basadas en el procesador AMD EPYC™.
<br/>
https://techcommunity.microsoft.com/t5/azure-confidential-computing/expanding-azure-confidential-computing-with-new-amd-based/ba-p/2993530
<!-- #azure #virtualmachines #vm #microsoft #ConfidentialComputing epyc -->

## Kubernetes
**Las versiones 1.22.4, 1.21.7 y 1.20.13 ya están disponibles** son las primeras versiones [SLSA 1 compliance](https://github.com/kubernetes/release/issues/2267).
<br/>
https://twitter.com/puerco/status/1461176447742226440
<!-- #cloud #kubernetes #SLSA -->

**Containerd 1.5.8**: Nueva versión de containerd: correción para [CVE-2021-41190](https://github.com/opencontainers/distribution-spec/security/advisories/GHSA-mc8v-mgrf-8f4m) y corrección de bugs.
<br/>
https://github.com/containerd/containerd/releases/tag/v1.5.8
<!-- #cloud #kubernetes #containerd -->

**Nueva certificación KCNA** promovida por la [CNFC](https://www.cncf.io/) y todavía en fase de pruebas, certificará conocimientos básicos de Kubernetes, conocmientos generales relacionados con Kubernetes (almacenamiento, red o service mesh) y conocimientos de seguridad en la nube.
<br/>
https://www.cncf.io/announcements/2021/11/18/kubernetes-and-cloud-native-essentials-training-and-kcna-certification-now-available/
<!-- #cloud #kubernetes #kcna #certificaciones -->

## Varios
**Ya puedes utilizar imágenes Windows Server 2022** con Visual Studio 2022 en GitHub Actions y Azure Devops.
<br/>
https://github.blog/changelog/2021-11-16-github-actions-windows-server-2022-with-visual-studio-2022-is-now-generally-available-on-github-hosted-runners/
<!-- #cloud #github #azure #windows #windowsServer #visualstudio -->

**Disposible WSL 0.50.2** nueva versión disponible a través de la Microsoft Store. Incluye varias mejoras y una de las mas destacadas es la actualización del kernel de Linux a la versión 5.10.74.3.
<br/>
https://www.neowin.net/news/microsoft-releases-wsl-version-0502-with-a-new-logo-and-an-updated-linux-kernel
<!-- #cloud #microsoft #wsl -->

**OpenAI API ya está disponible de manera generalizada**
<br/>
https://openai.com/blog/api-no-waitlist/
<!-- #openai -->

**¿Debe programar un manager?**
<br/>
https://flopezluis.substack.com/p/debe-programar-un-manager
<!-- @flopezluis -->gi