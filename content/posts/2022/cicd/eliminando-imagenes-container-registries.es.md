---
author: "Javi Vela"
title: "Eliminando imágenes en nuestros container registries"
summary: >
    Nos guste o no nos guste **el almacenamiento no es infinito**, el límite puede ser físico o económico y con la parte económica seguro que más de uno nos hemos llevado una sorpresa revisando la factura de nuestro cloud provider. 
date: "2022-02-23"
tags: ["CI", "ACR", "ECR", "Azure", "Amazon", "Container registries"]
ShowToc: false
draft: false
---
> _**Advertencia**_: Antes de aplicar cualquier política o proceso de borrado de imágenes, es **altamente recomendable que revises las políticas y procesos en modo “dry run” y revises los resultados**.

<br/>

Nos guste o no nos guste **el almacenamiento no es infinito**, el límite puede ser físico o económico y con la parte económica seguro que más de uno nos hemos llevado una sorpresa revisando la factura de nuestro cloud provider. 

{{< twitter user="hectorarley" id="1436768351053885445" >}}

Uno de los elementos a los que **no solemos prestar atención es al almacenamiento de nuestros container registries**, pudiendo llegar a almacenar cientos o miles de imágenes generadas en nuestros procesos de CI y que pasados unos días normalmente ya no son necesarias. A continuación vamos a mostrar como podemos limpiar nuestro [Amazon Elastic Container Registry (Amazon ECR)](https://aws.amazon.com/ecr/) o [Microsoft Container Registry (Azure ACR)](https://azure.microsoft.com/services/container-registry/).
<br/>

### Amazon Elastic Container Registry (Amazon ECR)
Amazon nos permite configurar **políticas de ciclo de vida ([Lifecycle policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html))** para cada uno de nuestros repositorios pudiendo definir varias reglas.

Cada política puede ser **configurada manualmente** (opción NO recomendada) o crearla de **manera programática**. Mi recomendación es que la creéis dentro de un paso en vuestro proceso de CI, si en el futuro necesitáis realizar un cambio de una política o regla en varios repositorios será una tarea rápida, fácil e indolora.

La política se define a través de un JSON pudiendo definir varias reglas con diferentes filtros:
- Fecha push
- Numero de imágenes 
- Estado
- Tag (expresión regular)

``` JSON 
{
    "rules": [
        {
            "rulePriority": 1,
            "description": "Expire images older than 14 days",
            "selection": {
                "tagStatus": "untagged",
                "countType": "sinceImagePushed",
                "countUnit": "days",
                "countNumber": 14
            },
            "action": {
                "type": "expire"
            }
        }
    ]
}
``` 
<br/>
Una vez tengáis la política definida (se puede validar desde la consola de AWS https://docs.aws.amazon.com/AmazonECR/latest/userguide/lpp_creation.html podéis configurarla a través del comando:

``` bash
aws ecr put-lifecycle-policy --repository-name ${REPOSITORY} --lifecycle-policy-text file://ecr_lifecycle_policy.json
```
<br/>

### Azure Container Registry (Azure ACR)
En Azure **no existen las políticas de ciclo de vida (Lifecycle policies)** para eliminar imágenes. Para ello debemos hacer uso de **[Azure cli](https://docs.microsoft.com/cli/azure/install-azure-cli)** y el comando **[acr purge](https://docs.microsoft.com/azure/container-registry/container-registry-auto-purge)**.

El comando **acr purge** acepta dos parámetros:
- **--filter**: Definimos a través de una expresión regular que imágenes hay que eliminar
- **--ago**: elimina las imágenes con una antigüedad mayor a la indicada (ej. --ago 1d, elimina las imágenes con una antiguedad mayor a 1d)

Para ejecutar el comando podemos utilizar **[ACR Tasks](https://docs.microsoft.com/azure/container-registry/container-registry-tasks-overview)** (tiene un coste por tiempo de ejecución), este servicio nos permite ejecutar tareas mantenimiento sobre nuestro ACR de manera puntual o programada.

Al igual que con Amazon, mi recomendación es que ejecutéis el borrado dentro de vuestro proceso CI.

``` bash
PURGE_CMD="acr purge \
--filter "${REPOSITORY}:^mytag-" \
--filter "${REPOSITORY}:^myothertag-" \
--untagged \
--ago 15d"

az acr run \
--cmd "$PURGE_CMD" \
--registry "$REGISTRY" \
--timeout 300 \
/dev/null
```
<br/>

### Referencias
https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html
https://docs.microsoft.com/azure/container-registry/container-registry-tasks-overview
https://docs.microsoft.com/azure/container-registry/container-registry-auto-purge
