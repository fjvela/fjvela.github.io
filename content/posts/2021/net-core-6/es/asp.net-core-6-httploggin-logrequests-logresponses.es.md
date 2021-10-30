---
author: "Javi Vela"
title: "ASP.NET Core 6 - HttpLogging (log request/responses)"
summary: >
   En algunas ocasiones hemos necesitado obtener las información del tráfico de entrada y salida (HTTP request / HTTP response) de nuestras aplicaciones ASP.NET core. Hasta la versión 6 de .NET era necesario escribir nuestro propio middleware. En esta versión, Microsoft ha incluido un middleware para poder loguear esta información.
date: "2021-11-02"
tags: ["dotnet", "asp.net", "log", "logging", "response", "request", "HTTP", "HTTP logging"]
ShowToc: true
---

En algunas ocasiones hemos necesitado obtener la información del tráfico de entrada y salida (HTTP request / HTTP response) de nuestras aplicaciones ASP.NET core. Hasta la versión 6 de .NET era necesario escribir nuestro propio [*middleware*](https://docs.microsoft.com/es-es/aspnet/core/fundamentals/middleware/?view=aspnetcore-5.0). En esta versión, Microsoft ha incluido un middleware para poder loguear la siguiente información:
- HTTP request
- HTTP response
- Headers
- Common properties
- Body

**_¡Advertencia!_**
El middleware HTTP logging puede afectar al rendimiento de la aplicación, también debes tener en cuenta que se puede mostrar información sensible de tu aplicación.

**_¡Advertencia!_**
Cuando se configura el middleware para loguear todas las cabederas de respuesta no se realiza de manera correcta, el bug ya había sido reportado y puedes comprobar el estado en el siguiente enlace: https://github.com/dotnet/aspnetcore/issues/36920 

## ¿Como habilitar HTTP logging?
El método [**_UseHttpLogging_**](https://docs.microsoft.com/es-es/dotnet/api/microsoft.aspnetcore.builder.httploggingbuilderextensions.usehttplogging?view=aspnetcore-6.0) de la extensión [_HttpLoggingBuilderExtensions_](https://docs.microsoft.com/es-es/dotnet/api/microsoft.aspnetcore.builder.httploggingbuilderextensions?view=aspnetcore-6.0) permite habilitar el middleware. Si necesitas que el formato de los logs tengan [formato W3C](https://docs.microsoft.com/es-es/aspnet/core/fundamentals/w3c-logger/?view=aspnetcore-6.0) utiliza el método [**_UseW3CLogging_**](https://docs.microsoft.com/es-es/dotnet/api/microsoft.aspnetcore.builder.httploggingbuilderextensions.usew3clogging?view=aspnetcore-6.0).
```c#
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    app.UseHttpLogging();

    app.UseRouting();

    app.UseEndpoints(endpoints =>
    {
        endpoints.MapGet("/", async context =>
        {
            await context.Response.WriteAsync("Hello World!");
        });
    });
}
```

Si utilizas _minimal APIs_
```c#
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
app.UseHttpLogging();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
```

Modifica el nivel de log **_Microsoft.AspNetCore.HttpLogging_** en el fichero de configuración **_appsettings.json_**.
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Information",
      "Microsoft.AspNetCore.HttpLogging": "Information",
    }
  },
  "AllowedHosts": "*"
}
```
Por defecto mostrará la siguiente información:
```
info: Microsoft.AspNetCore.HttpLogging.HttpLoggingMiddleware[1]
      Request:
      Protocol: HTTP/2
      Method: GET
      Scheme: https
      PathBase:
      Path: /WeatherForecast
      Accept: text/plain
      Host: localhost:7126
      User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0
      :method: [Redacted]
      Accept-Encoding: gzip, deflate, br
      Accept-Language: en,es-ES;q=0.8,es;q=0.5,en-US;q=0.3
      Cookie: [Redacted]
      Referer: [Redacted]
      TE: trailers
      DNT: 1
      sec-fetch-dest: [Redacted]
      sec-fetch-mode: [Redacted]
      sec-fetch-site: [Redacted]
```

## Opciones de configuración personalizadas
Puedes realizar una configuración personalizada utilizando el método **_AddHttpLogging_**:
```c#
public void ConfigureServices(IServiceCollection services)
{
    services.AddHttpLogging(logging =>
    {
        // Customize HTTP logging here.
        logging.LoggingFields = HttpLoggingFields.All;
        logging.RequestHeaders.Add("My-Request-Header");
        logging.ResponseHeaders.Add("My-Response-Header");
        logging.MediaTypeOptions.AddText("application/javascript");
        logging.RequestBodyLogLimit = 4096;
        logging.ResponseBodyLogLimit = 4096;
    });
}
```

Si utilizas _minimal APIs_
```c#
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpLogging(options =>
{
    // Customize HTTP logging here.
    options.LoggingFields = Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.All;
    options.RequestHeaders.Add("My-Request-Header");
    options.ResponseHeaders.Add("My-Response-Header");
    options.MediaTypeOptions.AddText("application/javascript");
    options.RequestBodyLogLimit = 4096;
    options.ResponseBodyLogLimit = 4096;
});

var app = builder.Build();
app.UseHttpLogging();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

```
- [LoggingFields](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/http-logging/?view=aspnetcore-6.0#loggingfields): Te permite configurar que elementos se van a loguear. Por ejemplo el flag  **_LoggingFields.RequestProtocol_** solo mostrará el protocolo utilizado en la petición.
- [RequestHeaders](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/http-logging/?view=aspnetcore-6.0#loggingfields): Logueará aquellos request headers que estén incluidos en la lista. 
- [ResponseHeaders](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/http-logging/?view=aspnetcore-6.0#responseheaders): Logueará aquellas response headers que estén incluidos en la lista.
- [RequestBodyLogLimit](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/http-logging/?view=aspnetcore-6.0#requestbodyloglimit): Tamaño máximo del _body_ a loguear de la petición. Valor por defecto: 32 KB.
- [RequestBodyLogLimit](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/http-logging/?view=aspnetcore-6.0#responsebodyloglimit): Tamaño máximo del _body_ a loguear de la respuesta. Valor por defecto: 32 KB.

## Rendimiento
A tráves de una pequeña prueba de carga con [artillery](https://artillery.io/) podemos comparar el rendimiento de nuestra aplicación con y sin el middleware **_HttpLogging_**. A continuación podemos comprobar los resultados.

### Sin middleware
```
--------------------------------
Summary report
--------------------------------

vusers.created_by_name.Get weather forecast: ................ 7754
vusers.created.total: ....................................... 7754
vusers.completed: ........................................... 7754
vusers.session_length:
  min: ...................................................... 3.7
  max: ...................................................... 78.5
  median: ................................................... 8.2
  p95: ...................................................... 21.1
  p99: ...................................................... 32.1
http.request_rate: .......................................... 76/sec
http.requests: .............................................. 15508
http.codes.307: ............................................. 7754
http.responses: ............................................. 7754
http.response_time:
  min: ...................................................... 0
  max: ...................................................... 67
  median: ................................................... 3
  p95: ...................................................... 15
  p99: ...................................................... 25.8
expect.ok: .................................................. 7754
expect.ok.statusCode: ....................................... 7754
errors.UNABLE_TO_VERIFY_LEAF_SIGNATURE: ..................... 7754
```

### Con middleware
```
--------------------------------
Summary report 
--------------------------------

vusers.created_by_name.Get weather forecast: ................ 3166
vusers.created.total: ....................................... 3166
vusers.completed: ........................................... 3164
vusers.session_length:
  min: ...................................................... 7.9
  max: ...................................................... 2308.1
  median: ................................................... 43.4
  p95: ...................................................... 1064.4
  p99: ...................................................... 1790.4
http.request_rate: .......................................... 36/sec
http.requests: .............................................. 6330
http.codes.307: ............................................. 3164
http.responses: ............................................. 3164
http.response_time:
  min: ...................................................... 4
  max: ...................................................... 2294
  median: ................................................... 37.7
  p95: ...................................................... 1064.4
  p99: ...................................................... 1790.4
expect.ok: .................................................. 3164
expect.ok.statusCode: ....................................... 3164
errors.UNABLE_TO_VERIFY_LEAF_SIGNATURE: ..................... 3164
```
<br/>

## Referencias
- https://devblogs.microsoft.com/aspnet/asp-net-core-updates-in-net-6-preview-4/?WT.mc_id=DT-MVP-5004074#http-logging-middleware
- https://docs.microsoft.com/en-us/aspnet/core/fundamentals/http-logging/?view=aspnetcore-6.0
- https://github.com/fjvela/netcore6-examples/tree/main/HttpLoggingMiddlewareSample