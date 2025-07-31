Solo vas a trabajar dentro de la carpete herramientas/

Asunto: Proyecto de Inteligencia Comercial para Equipo de Ventas de ISP

Hola Copilot,

Necesito tu ayuda para resolver un desafío de inteligencia comercial para un Proveedor de Servicios de Internet (ISP) llamado Usittel en Tandil, Argentina. El objetivo es aumentar la tasa de conversión de nuestra vendedora de campo, Victoria.

Contexto General:

Victoria recorre la ciudad visitando domicilios para vender nuestro servicio de Internet por fibra óptica. Actualmente, su ruta no está optimizada, lo que resulta en un bajo ratio de ventas por visita. Queremos usar nuestros datos internos para dirigirla a los domicilios con mayor probabilidad de contratación.

Los Datos con los que Contamos:

Base de Datos de Marketing (BASE): Un listado de miles de domicilios a los que hemos enviado folletos. Para cada domicilio, tenemos datos como la dirección completa, el nombre del residente y un estado que indica si respondieron, si contrataron o si no respondieron al folleto.

Base de Datos de Infraestructura (Cajas): Un listado de todas nuestras cajas de conexión de fibra óptica (NAPs) instaladas en la ciudad. Para cada caja, tenemos su nomenclatura, su dirección (a veces es una esquina, a veces una altura específica) y su porcentaje de ocupación (cuántos clientes tiene conectados sobre su capacidad total).

Listado de Edificios: Un archivo con las direcciones de los principales edificios residenciales de la ciudad.

El Problema a Resolver (La Tarea Principal):

Queremos generar una lista de alta prioridad para Victoria. Un domicilio debe aparecer en esta lista si cumple dos condiciones simultáneamente:

El residente figura en nuestra base de datos con el estado "NO CONTRATÓ: NO RESPONDIÓ AL FLYER".

El domicilio está ubicado físicamente muy cerca de una de nuestras cajas (NAPs) que tiene una ocupación muy baja o nula (por ejemplo, menos del 30%).

La lógica es que estas personas son el objetivo perfecto: viven en una zona con disponibilidad técnica inmediata y garantizada, pero probablemente no recibieron o ignoraron nuestra comunicación inicial. Una visita personal aquí tiene un potencial de conversión muy alto.

Ideas y Desafíos del "Cómo Hacerlo":

Aquí es donde necesito tu ayuda. No se trata simplemente de cruzar archivos.

Un primer intento fue cruzar los archivos buscando coincidencias en los nombres de las calles. Sin embargo, este enfoque es incorrecto y muy impreciso. Una dirección y una caja pueden estar en la misma calle pero a 15 cuadras de distancia, lo que no sirve.

La solución real debe ser más "inteligente". Te sugiero explorar un enfoque basado en análisis geoespacial. Esto podría implicar ideas como:

Geolocalización: Pensar en cómo convertir las direcciones de los domicilios y las cajas en coordenadas geográficas (latitud y longitud).

Cálculo de Proximidad Real: Una vez que todo esté en un mapa virtual, idear una forma de calcular la distancia real en metros entre un domicilio y las cajas cercanas.

Filtrado por Radio: Establecer un radio de acción efectivo (por ejemplo, 100 metros o menos) para determinar qué significa "muy cerca". Un cliente dentro de este radio de una caja vacía es un candidato ideal.

El resultado final debería ser un listado limpio que contenga, para cada cliente potencial, información sobre la caja más cercana y la distancia a la que se encuentra.

¿Qué enfoque y herramientas sugerirías para llevar a cabo este análisis de la manera más precisa y eficiente posible?