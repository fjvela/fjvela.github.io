---
author: "Javi Vela"
title: "Novedades en C# 11"
summary: >
    Echamos un vistazo a las novedades de C# 11
date: "2023-01-20"
tags: ["C#", "dotnet"]
ShowToc: true
draft: false
---

En noviembre de 2022 se lanzó .NET 7 y desde ese momento tenemos disponibles todas las novedades que trae C# 11. A continuación revisamos algunas de ellas.

Puedes encontrar el código fuente de los ejemplos en repositorio: https://github.com/fjvela/csharp-11

## Raw strings
Hasta ahora la manera de poder definir cadenas de texto multilínea en C# es utilizar el prefijo @. Uno de los problemas que presenta es que si se indenta el texto la salida del este se verá afectada o si se utilizan comillas es necesario escaparlas.

C# 11 incluirá una nueva manera de definir cadenas de texto, para ello deberemos utilizar como mínimo tres comillas ```"""```. Esto nos facilitará poder indentar cadenas de texto en nuestro código y evitar tener que escapar las comillas. En el caso de utilizar una cadena de texto interpolada (string interpolation - "Hello, I'm {{ name }}"), deberemos utilizar como mínimo dos dólares ```$$```.

#### Definición de cadenas de texto multilínea en C#
```csharp	
    var myString = @"
          <element attr=""content""/>";
```
Resultado:
```
          <element attr="content"/>
```

#### Definición de cadenas de texto multilíneas en C# 11
```csharp	
    var myStringRaw = """
          <element attr="content"/>
          """;
```
Resultado:
```
<element attr="content"/>
```
![Resultado ejecución](/2023/dotnet/csharp-11-raw-strings.png)

#### Definición de cadenas de texto interpoladas en C# 11
```csharp	
    var myJSONRawInterpolated = $$"""
        {
            "name": "{{name}}"
        }
        """;
```
Resultado:
```
{
    "name": "Javi Vela"
}
```	

- Leer más: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11#raw-string-literals

## List pattens
Nos permitirá comparar un patrón con un _array_ o _list_ de elementos, por lo que podríamos definir un método con los siguientes patrones:

```csharp
    int CheckSwitch(int[] values) => values switch
    {
        [1, 2, .., 10] => 1,
        [1, 2] => 2,
        [1, _] => 3,
        [1, ..] => 4,
        [21] => 5,
        [21, _, ..] => 6,
        [33, _, 34, .., 44] => 7,
        [_, ..] => 50
    };
```
El resultado de la ejecución sería:
```csharp
    Console.WriteLine(CheckSwitch(new[] { 1, 2, 10 }));                 // prints 1
    Console.WriteLine(CheckSwitch(new[] { 1, 2, 7, 3, 3, 10 }));        // prints 1
    Console.WriteLine(CheckSwitch(new[] { 1, 2 }));                     // prints 2
    Console.WriteLine(CheckSwitch(new[] { 1, 3 }));                     // prints 3
    Console.WriteLine(CheckSwitch(new[] { 1, 3, 5 }));                  // prints 4
    Console.WriteLine(CheckSwitch(new[] { 2, 5, 6, 7 }));               // prints 50
    Console.WriteLine(CheckSwitch(new[] { 21, 52, 63, 74, 5 }));        // prints 5
    Console.WriteLine(CheckSwitch(new[] { 21 }));                       // prints 6
    Console.WriteLine(CheckSwitch(new[] { 33, 0, 34, 1, 2, 3, 44 }));   // prints 7
```

También podemos utilizarlo con la sentencia ```if``` y obtener los valores del mismo:
```csharp
if (numbers is [var first, _, _])
{
    Console.WriteLine($"The first element of a three-item list is {first}.");
}

if (numbers is [1, var second, _])
{
    Console.WriteLine($"The second element of a three-item list is {second}.");
}
```

- Leer más: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11#list-patterns

## UTF-8 String literals
Si tu aplicación necesita cadenas de texto en formato UTF-8 (ej: necesita comunicarse con otras a través de protocolos HTTP), el sufijo ```u8``` puede ahorrarte unas líneas de código.

Añadiendo el sufijo ```u8```, automáticamente transforma la cadena de texto en un array de bytes en formato UTF-8.

Por defecto para convertir una cadena de texto en un array de bytes en UTF-8, necesitas:

```csharp
    byte[] data = System.Text.Encoding.UTF8.GetBytes("Javi Vela");
```

Gracias al sufijo 'u8', simplificamos la conversión:

```csharp
    byte[] data = "Javi Vela"u8.ToArray();
```

- Leer más: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11#utf-8-string-literals

## Newlines in string interpolation expressions
Versiones anteriores C# 11 no permiten el uso de saltos de línea en cadenas de texto interpoladas  (string interpolation - "Hello, I'm {{ name }}").

En el caso de utilizarlas, el compilador da un error como podemos ver en la siguiente imagen.

![C# 10, error de compilación salto de líneas en un string interpolated](/2023/dotnet/csharp-11-newlines-string-interpolations.png)

C# 11 nos permite añadir saldos de línea sin modificar el formato del texto:

```csharp
    Console.WriteLine($"Hello {name
        }!!, How are you?");
``` 
![C# 11, compilación y ejecución de la aplicación ](/2023/dotnet/csharp-11-newlines-string-interpolations-result.png)

- Leer más: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11#newlines-in-string-interpolations

## Generic math support
C# 11 incluye el soporte genérico de los datos matemáticos, permitiéndonos construir métodos genéricos como el siguiente:

```csharp
    T AddAll<T>(T[] items) where T : INumber<T>
    {
        T result = T.Zero;
        foreach (var item in items)
            result += item;
        return result;
    }

    int[] numbers = new[] { 1, 5, 6, 9, 19};

    Console.WriteLine(AddAll(numbers));
```

- Leer más: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11#generic-math-support

## Required members
Existe un nuevo modificador ```required``` que podemos añadir a nuestras propiedades para indicar que los constructores deben inicializar esa propiedad, en caso contrario nuestra aplicación no compilara.

El siguiente código muestra la inicialización de una clase pero no se ha inicializado la propiedad Name en el constructor por lo que tendremos un error de compilación.

```csharp
var user = new User { };

Console.WriteLine($"Name: {user.Name}");

class User
{
    public required string Name { get; init; }
}
```
![C# 11, error de compilación propiedad 'Name' no inicializada](/2023/dotnet/csharp-11-required-attribute-error.png)

- Leer más: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11#required-members

## File-local types
Se incluye en C# 11 un nuevo modificador de clases, ```file```. Al indicar el  modificador de acceso ```file``` estamos indicando que la visibilidad (scope) de la clase es dentro del mismo fichero.

![C# 11 ejemplo clases modificador 'file'](/2023/dotnet/csharp-11-file-class-modifier.png)

Si decompilamos la aplicación compilada podemos ver lo siguiente:

![C# 11 liberia decompilada, las clases con modificador 'file' no están](/2023/dotnet/csharp-11-file-class-modifier-dll-decompiled.png)

- Leer más: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11#file-local-types

## Auto-default-structs
Versiones anteriores a C# 11 obligan a inicializar todas las propiedades de un struct. C# 11 inicializará automáticamente todas las propiedades que no han sido inicializadas.

En la siguiente imagen podemos ver como automáticamente se ha inicializado la propiedad 'Y' con el valor por defecto de su tipo, en este caso cero.

![C# 11, definición de un struct. La propiedad Y no está inicializada y el compilador la ha inicializado a cero](/2023/dotnet/csharp-11-auto-default-structs-init.png)

A continuación podemos ver la librería decompilada y como el compilador ha añadido el código necesario para inicializar la propiedad por nosotros:

![C# 11, librería decompilada. Por defecto el valor de Y en el constructor es cero](/2023/dotnet/csharp-11-auto-default-structs-init-decompiled.png)

- Leer más: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11#auto-default-struct

## Referencias
- https://devblogs.microsoft.com/dotnet/early-peek-at-csharp-11-features/
- https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md
- https://github.com/fjvela/csharp-11
