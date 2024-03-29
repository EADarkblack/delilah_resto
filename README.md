# DELILAH RESTÓ

Es una API dirigida a la gestión de usuarios, pedidos y productos de un restaurante. La API de Delilah Restó esta contruida en base de la arquitectura API Rest. Y con esta se busca implementar un sistema CRUD para una sistema de gestión de pedidos de un restaurante.

_Versión de la API:_ /v1

## Proceso de instalación

A continuación verá los requisitos necesarios para la intalación junto con los pasos de instalación y configuración del servidor en un entorno local.

### Requisitos:

- Tener instalado [Node JS](https://nodejs.org/es/).

- Tener instalado [MySQL](https://www.mysql.com).

- Tener instalado cualquier interfaz gráfica de MYSQL, tales como [MySQL Workbench](https://www.mysql.com/products/workbench/), [Heidy SQL](https://www.heidisql.com), [PHPMyAdmin](https://www.phpmyadmin.net) o [DBeaver](https://dbeaver.io).

- Opcional: Tener instalado [Postman](https://www.postman.com).

### Instalación:

1. Crear e importar la base de datos desde el archivo **delilah_resto_DB.sql** al gestor de base de datos MySQL de preferencia.

2. Abrir dentro de la carpeta del servidor una consola nueva y ejecutar el siguiente comando para instalar todas las dependecias necesarias:

<pre>npm install</pre>

3. Una vez instaladas todas las dependencias, se tiene que crear un archivo **.env** el cual contendra todas las variables necesarias para la correcta conexión entre el servidor y la base de datos previamente importada.

Este archivo **.env** debera contener las siguientes variables:

<pre>
# Versión de la API
VERSION=/v1

# Puerto de la base de datos
PORT=3306

# Nombre del usuario de la base de datos
USER=your_username

# Contraseña de la base de datos
PASSWORD=your_password

# Nombre de la base de datos
DB_NAME=delilah_resto

# Clave de encriptación para los JWT
KEY=your_secret_key
</pre>

4. Una vez creado el archivo **.env** se puede proceder a ejecutar el servidor, para ello dispone de dos opciones de ejecución, uno por medio de la libreria **Nodemon** y la otra por medio de la ejecución propia de **Node JS**.

- _Ejecución usando solamente Node JS_:

<pre>npm run start</pre>

- _Ejecución usando la libreria **Nodemon**_:

<pre>npm run dev</pre>

_Nota: La correcta conexión de la base de datos se debe demostrar cuando el servidor una vez ejecutado devuelva el siguiente mensaje por consola:_

<pre>App listening on port 4000!</pre>

## Documentación:

Para hacer uso de esta API puede guiarse por medio de la documentación proporcionada en el archivo **delilah_doc.yaml** para ello es necesario que abra este archivo en [Swagger](https://editor.swagger.io).

_Nota: La base de datos por defecto no tiene ningún registro, por lo que para poder empezar a usar esta API será necesario crear un usuario nuevo._

===================================

_Desarrollado por: Wilmar Miguez_
