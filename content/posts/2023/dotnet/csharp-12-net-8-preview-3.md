---
author: "Javi Vela"
title: "Novedades en C# 12 (.NET 8 preview 3)"
summary: >
    Echamos un vistazo a las novedades de C# 12 (.NET 8 preview 3)
        - Primary constructors for classes and structs
        - Using directives for additional types
        - Default values for lambda expressions
date: "2023-05-03"
tags: ["C#", "dotnet"]
ShowToc: true
draft: false
---

Ya tenemos disponibles las primeras novedades que incluirá C# 12 en el lanzamiento de .NET 8. A continuación revisamos algunas de ellas.

Puedes encontrar el código fuente de los ejemplos en repositorio: https://github.com/fjvela/csharp-12

## Primary constructors for classes and structs
Los _Primary constructors_ nos permiten definir una lista de parámetros en la definición de la clase, en lugar de tener que crear un constructor por separado. De esta manera, se puede definir una clase en una sola línea de código.

En C# 9 permitió la utilización de _Primary constructors_ para las estructuras de datos `record`. C# 12 extiende esta funcionalidad a todas las clases, permitiendonos definir constructures de manera más concisa a tráves de _Primary constructors_.

### Definición _Primary constructors_ en clases
```csharp
    public abstract class Figure(double x, double y)
    {
        public double X { get; } = x;
        public double Y { get; } = y;
    }

    public class Rectangle(double x, double y, double width, double height) : Figure(x, y)
    {
        public double Width { get; } = width;
        public double Height { get; } = height;
    }

    public class Circle(double x, double y, double radius) : Figure(x, y)
    {
        public double Radius { get; } = radius;
    }
```
![Resultado binario decompilado, Primary constructors -Rectangle](/2023/dotnet/csharp-12-net8-preview-3-primary-constructor-decompiled-Figure.png)
![Resultado binario decompilado, Primary constructors -Rectangle](/2023/dotnet/csharp-12-net8-preview-3-primary-constructor-decompiled-Rectangle.png)
![Resultado binario decompilado, Primary constructors -Rectangle](/2023/dotnet/csharp-12-net8-preview-3-primary-constructor-decompiled-Circle.png)


## Using directives for additional types
Actualmente la directiva `using` no nos permite crear alias para cualquier tipo de dato como por ejemplo: tuplas o arrays. Con C# 12 podemos crear alias para cualquier tipo como ```(string, int)``` o ```int[];```.

### Definición alias para cualquier tipo de datos
```csharp
    using Address = (string city, string postalCode);
    using PathOfPoints = int[];
    using DatabaseInt = int?;
    using Measurement = (string units, int distance);

    using Person = (string name, int age);

    void Method(Measurement x) 
    {
        Console.WriteLine($"Method! {x.units} {x.distance} ");
    }


    Console.WriteLine("Hello, human!");

    Person person = new Person("Javier", 22);
    Address address = new Address("My home", "ES-50105");
    PathOfPoints points = new int[] { 2, 5, 5 };

    Method(new Measurement("meters", 23));
```
![Resultado binario decompilado, Using directives for additional types](/2023/dotnet/csharp-12-net8-preview-3-using-any-type-decompiled.png)

## Default values for lambda expressions
C# 12 incluye nuevas mejoras en la utilización de expresiones lambda. Con C# 12 podemos definir valores por defecto en los parámetros de las expresiones lambda.

### Definición valores por defecto
```csharp
    var  sum = (int x = 0, int y = 0) => x + y;
    Console.WriteLine(sum()); // Output: 0
    Console.WriteLine(sum(1)); // Output: 1
    Console.WriteLine(sum(1, 2)); // Output: 3


    var greet = (string name = "World", int times = 1) =>
    {
        string greeting = $"Hello, {name}!";
        if (times > 1)
        {
            greeting += $" ({times} times)";
        }
        return greeting;
    };
    Console.WriteLine(greet()); // Output: Hello, World!
    Console.WriteLine(greet("Alice")); // Output: Hello, Alice!
    Console.WriteLine(greet("Bob", 3)); // Output: Hello, Bob! (3 times)
```
![Resultado binario decompilado, Default values for lambda expressions](/2023/dotnet/csharp-12-net8-preview-3-default-values-lambda-decompiled.png)

## Referencias
- https://devblogs.microsoft.com/dotnet/check-out-csharp-12-preview/
- https://learn.microsoft.com/en-gb/dotnet/csharp/language-reference/proposals/primary-constructors
- https://learn.microsoft.com/en-gb/dotnet/csharp/language-reference/proposals/using-alias-types
- https://learn.microsoft.com/en-gb/dotnet/csharp/language-reference/proposals/lambda-method-group-defaults
- https://github.com/fjvela/csharp-12
