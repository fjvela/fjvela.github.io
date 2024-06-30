---
author: "Javi Vela"
title: "Mejora la experiencia de desarrollo, desarrolla dentro de un contenedor"
summary: > 
  En algunas ocasiones es algo tedioso instalar los SDKs o dependencias de un proyecto para poder trabajar con él. Visual Studio Code Dev Containers te permite definir y distribuir el entorno de desarrollo de tu proyecto.
date: "2022-11-30"
tags: ["dev tools", "Visual Studio Code", "contenedores"]
ShowToc: false
draft: false
---
## Introducción
Al comenzar un nuevo proyecto es necesario instalar SDKs o otras dependencias necesarias para desarrollar y ejecutar el proyecto, al principio es muy fácil recordar todos los pasos necesarios pero con el paso del tiempo seguramente ya no estén tan claros los pasos a seguir o qué dependencias son necesarias. Los _Readme_ son muy útiles pero no automatizan el proceso de instalación y seguramente no se hayan actualizado correctamente.
 
Otro escenario bastante común en nuestro día a día es trabajar en varios proyectos a la vez y con diferentes SDKs y dependencias entre ellos.
 
¿Te imaginas poder distribuir y mantener versionado un entorno de desarrollo al igual que versionas y distribuyes una aplicación?
<br/>
Si, es posible. [Visual Studio Code](https://code.visualstudio.com/) y el plugin [Visual Studio Code Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) te permite crear y utilizar un contenedor docker para instalar los requisitos necesarios para desarrollar, ejecutar y depurar tu aplicación.

## Dev Container
La configuración del contendor de desarrollo se define en el fichero devcontainer.json dentro de la carpeta .devcontainer (no olvides el punto 😄) en el fichero puedes definir:
 
- Imagen docker a utilizar, fichero docker a construir o fichero docker compose a utilizar
- Instalar herramientas
- Instalar extensiones de Visual Studio Code
- Definir puertos
- Definir argumentos y configuración por defecto
 
Cuando el contenedor está arrancado, se monta la carpeta de tu proyecto (volume mount) y se instala Visual Studio Code Server en el contenedor con la configuración indicada en el fichero.
 
![Arquitectura Visual Studio Code Dev Containers](/2022/devtools/architecture-containers.png)
 
A continuación vamos a configurar un contenedor de desarrollo para el proyecto [_terraform provider for confluent cloud_](https://github.com/confluentinc/terraform-provider-confluent), para poder desarrollar el proyecto es necesario (puedes encontrar [aqui](https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/DEVELOPING.md) todos los requisitos):
- Go 1.18 (to build the provider plugin)
- Terraform >= 0.14
- Docker para ejecutar los test de aceptación
- Recomendado utilizar Terraform version manager tfutils/tfenv
 
Para comenzar partiremos del repositorio de ejemplo para proyectos go https://github.com/Microsoft/vscode-remote-try-go. Al abrir el fichero _devcontainer.json_ podemos diferenciar tres secciones: **_build_**, **_runArgs_** y **_customizations_**.
 
El objeto **_build_** permite definir cómo se va a construir nuestra imagen de desarrollo, en el siguiente ejemplo definimos que se va a utilizar el fichero docker _Dockerfile_ indicando también los argumentos necesarios para construir la imagen. En el caso de que la imagen no esté almacenada localmente, se construirá la imagen con la configuración indicada.
```json
"build": {
  "dockerfile": "Dockerfile",
  "args": {
    "VARIANT": "1.18-bullseye",
    "NODE_VERSION": "lts/*"
  }
```
También podemos utilizar una imagen ya creada (propiedad [**_image_**](https://containers.dev/implementors/json_reference/#image-specific)) almacenada en un docker image registry (Docker Hub, Azure Container Registry,...), para utilizar un fichero docker compose debemos utilizar la propiedad [**__dockerComposeFile__**](https://containers.dev/implementors/json_reference/#compose-specific)
 
**_runArgs_** permite definir un array de argumentos que se utilizarán para ejecutar la imagen de desarrollo:
```json
"runArgs": [ "--cap-add=SYS_PTRACE", "--security-opt", "seccomp=unconfined" ],
```
 
**_customizations_** define la configuración de la instancia de Visual Studio Code, puedes encontrar las herramientas y servicios soportados [aqui](https://containers.dev/supporting):
```json
"customizations": {
  "vscode": {
    "settings": {
      "go.toolsManagement.checkForUpdates": "local",
      "go.useLanguageServer": true,
      "go.gopath": "/go",
      "go.goroot": "/usr/local/go"
    },
   
    "extensions": [
      "golang.Go"
    ]
  }
}
```

Una vez creado el fichero _devcontainer.json_, Visual Studio Code lo detectará cuando abrimos la carpeta del proyecto y nos preguntará si deseamos abrir nuestra carpeta usando el contendor. Una vez abierto, automáticamente comenzará a construir la imagen en caso de que fuera necesario:
 
![Notificación Visual Studio Code reabrir carpeta en contenedor ](/2022/devtools/visual-code-notification-reopen-in-container.png)
![Logs construcción del contenedor](/2022/devtools/build-container.png)
 
Ejecutamos los siguientes comandos para compilar el módulo y comprobar si nuestro contenedor de desarrollo funciona correctamente:
- make deps
- make build
 
Para poder ejecutar los test de aceptación (make testacc) es necesario tener instalado docker. Al estar trabajando dentro de un contenedor necesitamos habilitar docker in docker, permite a nuestro contenedor que se conecte al socket de docker de nuestra máquina y de esta manera podremos crear contenedores desde nuestro contenedor de desarrollo. 
 
Podemos encontrar el script necesario en el siguiente enlace https://github.com/microsoft/vscode-dev-containers/tree/main/containers/docker-in-docker una vez integrado en nuestro proyecto podemos utilizar docker desde nuestro contenedor. Los contenedores se ejecutarán en la máquina host.
 
![Resultado ejecución 'make build'](/2022/devtools/results-build.png)
![Resultado ejecución 'make testacc'](/2022/devtools/results-test-accep.png)


Puedes encontrar todo la configuración necesaria en el siguiente enlace: https://github.com/fjvela/terraform-provider-confluent/commit/f12fc48d89cf3ceea77a2f7b8d7e791f59d255df

## Dev Container Features
El 15 de septiembre de 2022 se lanzó [Custom Dev Container Features](https://code.visualstudio.com/blogs/2022/09/15/dev-container-features), esta funcionalidad simplifica enormemente la configuración de nuestros contenedores de desarrollo permitiéndonos habilitar y deshabilitar Features desde el archivo devcontainer.json sin necesidad de añadir o eliminar scripts a nuestro contenedor.
 
Por ejemplo para habilitar la funcionalidad docker in docker tan solo es necesario habilitar la funcionalidad _**docker-in-docker**_, anteriormente hemos necesitado incluir y adaptar varios ficheros de configuración:
 
```json
   "ghcr.io/devcontainers/features/docker-in-docker:1": {
        "version": "latest",
        "moby": true
    } 
```

Cada Dev Container Feature se distribuye como _**tarballs**_, cada uno de ellos contiene al menos dos ficheros:
- **_install.sh_**: Script de instalación, se añade como una nueva capa de la imagen y se ejecuta durante la construcción de la imagen
- **_devcontainer-feature.json_**: Contiene información sobre la Feature y contiene opciones que pueden pasarse como argumentos al script **_install.sh_**

Finalmente con menos de 20 líneas podemos configurar nuestro proyecto para utilizar Dev Container Features y poder distribuir y versionar nuestro entorno de desarrollo:

```json
{
	"name": "Go",
	"image": "mcr.microsoft.com/devcontainers/base:ubuntu",  // Any generic, debian-based image.

	"features": {
		"ghcr.io/devcontainers/features/go:1": {
			"version": "1.18"
		},
		"ghcr.io/devcontainers/features/docker-in-docker:1": {
			"version": "latest",
			"moby": true
		},
		"ghcr.io/devcontainers/features/terraform:1": {},
		"ghcr.io/devcontainers/features/git:1": {}
	},

	// Uncomment to connect as a non-root user. More info: https://aka.ms/vscode-remote/containers/non-root.
	"remoteUser": "vscode"
}
```

Puedes encontrar todo la configuración necesaria en el siguiente enlace: https://github.com/fjvela/terraform-provider-confluent/commit/b0cc3b1a2e60b67424901596da3c0770866dff51

### Referencias
- https://code.visualstudio.com/docs/devcontainers/tutorial
- https://code.visualstudio.com/docs/devcontainers/create-dev-container
- https://github.com/microsoft/vscode-dev-containers
- https://github.com/Microsoft/vscode-remote-try-go
- https://github.com/devcontainers
- https://containers.dev/features
