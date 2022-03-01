---
author: "Javi Vela"
title: "Novedades en C# 11 (preview)"
summary: >
    Echamos un vistazo a las novedades de C# 11: Raw strings, Simplified parameter null validation code (!!) y List pattens
date: "2022-03-02"
tags: ["C#", "dotnet", "preview"]
ShowToc: false
draft: false
---
> _**Advertencia**_: Las nuevas funcionalidades de C# 11 se encuentran en modo **preview** y es posible que sufran cambios.

Ya podemos revisar alguna de la novedades que traerá C# 11, para ello deberás instalar [.NET 6.0.200](https://dotnet.microsoft.com/en-us/download/dotnet/6.0) y configurar la propiedad ```LangVersion``` con el valor _Preview_ en los ficheros .csproj de tus proyectos:

```
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <LangVersion>preview</LangVersion>
  </PropertyGroup>

</Project>
```

Puedes encontrar el código fuente de los ejemplos en el siguiente repositorio: https://github.com/fjvela/csharp-11

## Raw strings
Hasta ahora la manera de poder definir cadenas de texto multilínea en C# es utilizar el prefijo @. Uno de los problemas que presenta es que si se identa el texto la salida del este se verá afectada o si se utilizan comillas es necesario escaparlas.

C# 11 incluirá una nueva manera de definir cadenas de texto, para ello deberemos utilizar como mínimo tres comillas ```"""```. Esto nos facilitará poder identar cadenas de texto en nuestro código y evitar tener que escapar las comillas.

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
![Resultado ejecución](/2022/dotnet/csharp-11-raw-strings.png)

- Leer más: https://github.com/dotnet/csharplang/blob/main/proposals/raw-string-literal.md


## Simplified parameter null validation code (!!)
A la hora de validar si un parámetro tiene un valor nulo podemos utilizar el siguiente código:
```csharp
   void MyAwesomeMethod(string mystring)
    {
        if (mystring == null)
            throw new ArgumentNullException(nameof(mystring));
    }
```

C# 11 nos ofrecerá realizar esta comprobación de una manera más sencilla, tan solo tenemos que añadir ```!!``` como sufijo al nombre del parámetro:
``` csharp
   void MyAwesomeMethod(string mystring!!)
    {
        
    }
```
- Leer más: https://github.com/dotnet/csharplang/blob/main/proposals/param-nullchecking.md

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

- Leer más: https://github.com/dotnet/csharplang/blob/main/proposals/list-patterns.md


### Referencias
- https://devblogs.microsoft.com/dotnet/early-peek-at-csharp-11-features/
- https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md
