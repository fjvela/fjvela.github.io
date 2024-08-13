---
author: "Javi Vela"
title: "Novedades en C# 13 (.NET 9 preview 6)"
summary: >
    Echamos un vistazo a las novedades de C# 13 (.NET 9 preview 6)
        - params collections
        - New lock type and semantics
        - New escape sequence - \e.
date: "2024-08-15"
tags: ["C#", "dotnet"]
ShowToc: true
draft: false
---

Ya va quedando menos para el lanzamiento de .NET 9 y tenemos disposibles algunas de las novedades que incluirá C# 13 en su lanzamiento  A continuación revisamos algunas de ellas.

Puedes encontrar el código fuente de los ejemplos en repositorio: https://github.com/fjvela/csharp-13

## params collections
El modificador `params` nos permite pasar un número variable de argumentos a un método. Hasta el momento estaba limitado unicamente al uso con tipos de datos _Array_.

```csharp
var persons = new List<Person>
{
   new Person("Mads", "Torgersen"),
   new Person("Dustin", "Campbell"),
   new Person("Kathleen", "Dollard")
};

static void WriteNames(params string[] names)
 => Console.WriteLine(String.Join(", ", names));

WriteNames(persons.Select(person => person.FirstName).ToArray());

internal class Person( string Name, string FirstName)
{
    public string Name { get; set; }
    public string FirstName { get; set; }
}
```
![Resultado binario decompilado, params collections](/2024/dotnet/csharp-13-net9-preview-6-params-collection-before-decompiled.png)

C# 13 extiende el modificador permitiendonos trabajar con cualquier tipo de colección, tales como: `System.Span<T>_, _System.ReadOnlySpan<T>`, y tipos de datos que implementan la interfaz `System.Collections.Generic.IEnumerable<T>`.

```csharp
static void WriteNames(params IEnumerable<string> names)
  => Console.WriteLine(String.Join(", ", names));

WriteNames(persons.Select(person => person.FirstName));
WriteNames(from p in persons select p.FirstName);

```
![Resultado binario decompilado, params collections](/2024/dotnet/csharp-13-net9-preview-6-params-collection-decompiled.png)

## New lock type and semantics
.NET 9 permitirá bloquear el acceso a recursos compartidos se pueda realizar de una manera más simple, eficiente y menos ambigua a través de la clase `System.Threading.Lock`.

Para poder usar esta nueva clase en nuestras aplicaciones existentes, solo tendremos que sustituir **`private object myLock = new object();`** por  **`private System.Threading.Lock myLock = new System.Threading.Lock();`**. C# automáticamente generará las llamadas necesarias a la API para usar la nueva clase.

```csharp
public class ClassLockTwo
{
    private System.Threading.Lock myLock = new System.Threading.Lock();

    public void MyMethod()
    {
        lock (myLock)
        {
            // Your code
        }
    }
}
```
![Resultado binario decompilado, lock](/2024/dotnet/csharp-13-net9-preview-6-lock-decompiled.png)

## New escape sequence - \e.
C# 13 introduce la secuencia de espace `\e`. Esta secuencia equivale al código unicode `\u001b`.

```csharp
Console.WriteLine("\e[1mThis is a bold text\e[0m");

Console.ReadLine();
```
![Resultado binario decompilado, lock](/2024/dotnet/csharp-13-net9-preview-6-escape-sequence-decompiled.png)

## Implicit indexer access in object initializers
En C# podemos utilizar el operador `^` para acceder a un elemento de un _Array_ desde el final del mismo. Con C# 13, podemos utilizarlo para inicializar elementos de un _Array_ desde el final del mismo.

```csharp
var countdown = new TimerRemaining(10)
{
    Buffer =
    {
        [^1] = 0,
        [^10] = 9
    }
};

Console.WriteLine($"First: {countdown.Buffer.First()} Last: {countdown.Buffer.Last()}");
Console.ReadLine();

class TimerRemaining(int bufferSize)
{
    public int[] Buffer  { get; set; } = new int[bufferSize];
}
```
![Resultado binario decompilado, lock](/2024/dotnet/csharp-13-net9-preview-6-implicit-index-decompiled.png)

## ref struct
A continuación podemos comprobar algunas novedades relacionadas con el tipo `ref struct` y C# 13.

### Enable ref locals and unsafe contexts in iterators and async methods
Para versiones anteriores a C# 13, no es posible utilizar los tipos `ref struct` en metodos iteradores (`yield return`). En los métodos asincronos (`async`) tampoco  se pueden declarar variables de este tipo ni pueden ser usadas en contextos inseguros. C# 13 nos permitirá hacer uso de este tipo en todos estos casos de uso.

```csharp
ref struct ClassOne
{
    public int Current => 0;
    public bool MoveNext() => false;
    public void Dispose() { }
}

class ClassTwo
{
    public ClassOne GetEnumerator() => new ClassOne();
    async void M()
    {
        await Task.Yield();
        using (new ClassOne()) { }
        lock (new System.Threading.Lock()) { }
        await Task.Yield();
    }
}
```

### Allow ref struct types as arguments for type parameters in generics.
Versiones anteriores a C# 13 no permiten hacer uso del tipo `ref struct`como parámetro generico de un método. A partir de esta versión ya es posible:

```csharp
T Identity<T>(T p)
    where T : allows ref struct
    => p;

var local = Identity(new User());

Console.ReadLine();

ref struct User
{

}
```

![Resultado binario decompilado, ref struct como tipo de dato en metodos genericos](/2024/dotnet/csharp-13-net9-preview-6-ref-struct-types-as-arguments-generics.png)

## Referencias
- https://devblogs.microsoft.com/dotnet/csharp-13-explore-preview-features/
- https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13
- https://github.com/fjvela/csharp-13
