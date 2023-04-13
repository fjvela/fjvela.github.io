---
author: "Javi Vela"
title: "Novedades en Dapr - Pluggable components"
summary: >
    Echamos un vistazo a cómo crear un Pluggable components en Dapr
date: "2023-04-13"
tags: ["kubernetes", "k8s", "dapr"]
ShowToc: true
draft: false
---
Hace unas semanas se lanzaba la [versión 1.10 de Dapr](https://blog.dapr.io/posts/2023/02/16/dapr-v1.10-is-now-available/) (16 de febrero de 2023) e incluia una novedad muy interesantes, _pluggable components_.

## Pluggable components
Dapr incluye una gran colección de componentes que podemos utilizar en nuestas aplicaciones, en el caso de que necesitaramos crear un componente privado seria algo complejo ya que deberiamos hacer un [fork](https://docs.github.com/es/get-started/quickstart/fork-a-repo) de los repositorios [dapr](https://github.com/dapr/dapr) y [components-contrib](https://github.com/dapr/components-contrib) y utilizando [Go](https://go.dev/) podriamos desarrollar nuestro componente a medida.

[Dapr 1.10](https://blog.dapr.io/posts/2023/02/16/dapr-v1.10-is-now-available/) incluye la posibilidad de crear e integrar nuestros propios componentes sin necesidad de modificar el código de Dapr a tráves de _pluggable components_ (preview). Un componente pluggable es aquel que no está incluido en el runtime de Dapr. 


La comunicación entre el componente y Dapr se realiza a tráves de [gRPC](https://grpc.io/) y [Unix Domain Sockets](https://en.wikipedia.org/wiki/Unix_domain_socket) por lo que podemos utilizar cualquier lenguaje de programación que soporte gRPC para desarrollar nuestro componente.

![Arquitectura registro y comunicación Dapr y un componente pluggable](/2023/kubernetes/dapr-pluggable-components-register-component.png)

A día de hoy podemos implementar 3 tipos de componentes. Dependiendo del tipo de componente, tendremos que implementar diferentes métodos:
- [State Store](https://docs.dapr.io/reference/components-reference/supported-state-stores/): Permiten leer, almacenar y consultar elementos clave / valor en los [almacenamientos implmentados](https://docs.dapr.io/reference/components-reference/supported-state-stores/)
- [Pub/sub](https://docs.dapr.io/reference/components-reference/supported-pubsub/): Permiten la comunicación a tráves de eventos
- [Bindings (Input / Ouput)](https://docs.dapr.io/reference/components-reference/supported-bindings/): Permiten [invocar](https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-bindings/) servicios externos y [recibir](https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/) eventos externos

### Desarrollo
Para desarrollar el componente vamos a usar .NET 7 ya que que soporta gRPC. Dapr ofrece una plantilla para .NET en el siguiente repositorio https://github.com/dapr/samples/tree/master/pluggable-components-dotnet-template. 

El tipo de componente que vamos a desarrollar será de tipo Binding (output) por lo que la interfaz a implementar será la siguiente:

- 1 método para la inicialización del componente initialization 
- 1 método para indicar que el componente está funcionando correctamente (health-ness or liveness check -Ping-)
- 1 método para ejecutar la lógica del componente
- 1 método para indicar la lista de acciones disponibles en el componente

Una vez actualizada la plantilla a .NET 7 y actualizadas las referencias del proyecto:

1. Registramos el gRPC service en la clase Program, en nuestro caso OutputBindingService
2. En la clase Service implementamos nuestra clase OutputBindingService, al tratarse de un Outbinding debemos implementar los métodos:
    - [Init](https://github.com/fjvela/dapr-CustomPluggableComponent/blob/main/DaprPluggableComponent/Services/Services.cs#L81)
    - [Invoke](https://github.com/fjvela/dapr-CustomPluggableComponent/blob/main/DaprPluggableComponent/Services/Services.cs#L106)
    - [ListOperations](https://github.com/fjvela/dapr-CustomPluggableComponent/blob/main/DaprPluggableComponent/Services/Services.cs#L129)
    - [Ping](https://github.com/fjvela/dapr-CustomPluggableComponent/blob/main/DaprPluggableComponent/Services/Services.cs#L147)

![Implementación - Init](/2023/kubernetes/dapr-pluggable-components-init.png)
![Implementación - Invoke](/2023/kubernetes/dapr-pluggable-components-invoke.png)
![Implementación - List operations](/2023/kubernetes/dapr-pluggable-components-list-operations.png)
![Implementación - Ping](/2023/kubernetes/dapr-pluggable-components-ping.png)


Compilamos y generamos la imagen Docker correspondiente, es importante que cuando generemos la imagen añadamos un usuario non-root:

```docker
RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser
```

### Despliegue del componente
Desplegar el nuestro componente pluggable es muy sencillo, tras generar la imagen con nuestra aplicación tan solo debemos generar un deployment y añadir las siguientes anotaciones a nivel de pod para indicarle a Dapr que registre nuestro componente:

```yaml
dapr.io/pluggable-components: "dapr-pluggable-component"
dapr.io/app-id: "my-app"
dapr.io/enabled: "true"
```

Automaticamente [Dapr Sidecar Injector](https://docs.dapr.io/concepts/dapr-services/sidecar-injector/) creará otro contenedor para ejecutar el servicio de Dapr ([SideCard pattern](https://docs.dapr.io/concepts/dapr-services/sidecar/)) y modificará el deployment para compartir el carpeta `/tmp/dapr-components-sockets` entre los dos contenedores a traves de un `volumeMounts`.

![Volume mounts entre containers](/2023/kubernetes/dapr-pluggable-components-volume-mounts.png)

Comprobamos el correcto funcionamiento del componente ejecutando directamente las peticiones al contenedor Dapr de nuestro deployment. Para ello:

1. Utilizamos [port forward](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/) para poder conectarnos al contenedor Dapr de nuestro deployment: 
```
kubectl port-forward deploy/mydapr-component  3500:3500
``` 
2. Ejecutamos las peticiones a nuestro pluggable component:
```
curl -X POST -H 'Content-Type: application/json' http://localhost:3500/v1.0/bindings/prod-mystore -d '{ "data": 100, "operation": "write" }'
```
```
curl -X POST -H 'Content-Type: application/json' http://localhost:3500/v1.0/bindings/prod-mystore -d '{ "data": 200, "operation": "read" }'
```

![Dapr pluggable component resultado ejecución](/2023/kubernetes/dapr-pluggable-components-execution-test.png)

# References
- https://docs.dapr.io/operations/components/pluggable-components-registration/
- https://blog.dapr.io/posts/2023/02/16/dapr-v1.10-is-now-available/