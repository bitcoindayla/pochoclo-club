# PRD — Reserva de asientos MVP

**Producto:** Pochoclo Club Web App  
**Iteración:** 1  
**Plataforma:** aplicación web responsive, mobile-first  
**Estado:** listo para implementación

## 1. Objetivo

Permitir que los miembros de Pochoclo Club reserven lugares para la próxima función del domingo y que los administradores puedan gestionar la función, la ocupación de la sala y la lista de espera.

El club es privado y gratuito. No existen pagos, cobros ni comprobantes.

## 2. Roles

### Miembro

Puede:

- Acceder mediante invitación.
- Iniciar sesión con Google.
- Ver la próxima función.
- Reservar un lugar propio.
- Reservar un lugar para un `+1`, esté registrado o no.
- Cambiar o cancelar sus reservas.
- Entrar a la lista de espera si no quedan lugares.

### Administrador

Puede:

- Generar enlaces de invitación.
- Crear la próxima función.
- Abrir y cerrar las reservas.
- Ver el mapa y la lista de espera.
- Mover o cancelar reservas.
- Bloquear lugares.
- Reordenar manualmente la lista de espera.

No puede superar la capacidad ni asignar dos personas al mismo lugar.

## 3. Acceso privado

- No existe registro público abierto.
- El administrador puede generar lotes de enlaces de invitación individuales.
- Cada enlace tiene un código único y un solo uso.
- Los enlaces vencen a los 30 días y pueden revocarse.
- El nuevo miembro abre el enlace y completa el registro mediante Google.
- Después del alta, ingresa normalmente utilizando Google.
- El primer administrador se configura durante la instalación del sistema.

## 4. Función

El administrador crea cada función manualmente con:

- Fecha.
- Horario.
- Título opcional.
- Mensaje opcional.
- Estado: `borrador`, `abierta` o `cerrada`.

Reglas:

- Solo puede existir una función abierta a reservas simultáneamente.
- No se crean funciones recurrentes automáticamente.
- Los miembros pueden modificar reservas solamente cuando la función está abierta.
- Una función cerrada continúa visible en modo lectura.
- Las funciones y reservas anteriores se conservan para futuros ratings y estadísticas, aunque todavía no tengan una pantalla histórica.

## 5. Mapa de la sala

La primera iteración utiliza una sala fija:

| Código | Nombre |
|---|---|
| A1 | Justine Triet |
| A2 | Sean Baker |
| A3 | Ryûsuke Hamaguchi |
| A4 | Yorgos Lanthimos |
| B1 | Ruben Östlund |
| B2 | Julia Ducournau |
| B3 | Hirokazu Koreeda |
| B4 | Denis Villeneuve |
| C1 | Joachim Trier |
| C2 | Park Chan-wook |
| C3 | Rodrigo Sorogoyen |
| C4 | Payal Kapadia |
| P1 | Lucrecia Martel |
| P2 | Céline Sciamma |

La interfaz debe representar:

- Pantalla.
- Doce asientos en tres filas.
- Pasillo.
- Dos espacios en el piso/pasillo.
- Puerta de ingreso.
- Orientación física de la sala.

Ubicación visual acordada para el diseño definitivo:

- `P1` se ubica entre `B2` y `B3`.
- `P2` se ubica entre `C2` y `C3`.
- Durante la implementación funcional pueden mostrarse separados; el ajuste fino del mapa queda para la etapa de UI.

El diseño visual definitivo se realizará posteriormente. Funcionalmente, deben distinguirse los estados:

- Disponible.
- Seleccionado.
- Ocupado.
- Reservado por mí.
- Reservado para mi invitado.
- Bloqueado.

El nombre real del ocupante será visible únicamente para miembros autenticados.

## 6. Reserva personal y `+1`

- Cada persona puede ocupar un único lugar por función.
- Un miembro puede reservar para sí mismo y para un solo invitado.
- El invitado puede ser un miembro registrado o una persona externa.
- Primero debe completarse la reserva personal.
- Después se habilita la reserva del `+1`.
- El nombre del invitado es obligatorio.
- El campo permite escribir un nombre libre y ofrece sugerencias de miembros registrados a medida que se escribe.
- No se muestran emails en las sugerencias.
- Un miembro registrado que ya tiene lugar o está en espera no puede ser agregado nuevamente.
- Los invitados externos no tienen una identidad verificable en el sistema; se conserva el límite de un solo `+1` por titular, pero no se puede detectar con certeza si dos nombres libres representan a la misma persona.
- Titular e invitado pueden quedar en categorías diferentes.
- Si el titular cancela su reserva, también se cancela automáticamente la de su `+1`.
- El titular puede cancelar únicamente al `+1` y conservar su reserva personal.

## 7. Lista de espera

- La lista aparece cuando no queda ningún asiento ni espacio de piso disponible.
- Tiene una capacidad máxima de cinco personas.
- Cada persona ocupa una posición individual.
- El titular y su invitado pueden ingresar independientemente.
- El orden inicial se determina por fecha y hora de ingreso.
- El administrador puede reordenarla manualmente.
- Después de un reordenamiento, las promociones respetan el nuevo orden.

## 8. Promoción automática

### Se libera un asiento normal

1. La persona que lleva más tiempo en el piso pasa al asiento liberado.
2. La primera persona de la lista de espera pasa al espacio de piso liberado.
3. Las demás personas avanzan una posición.

### Se libera un espacio de piso

1. La primera persona de la lista pasa al espacio disponible.
2. Las demás avanzan una posición.

Todas las reasignaciones deben ejecutarse como una única operación. Dos cancelaciones simultáneas no pueden duplicar lugares ni alterar incorrectamente el orden.

El administrador puede reorganizar lugares manualmente. Sus operaciones también deben conservar todas las reglas de capacidad y unicidad.

## 9. Bloqueo de lugares

- El administrador puede bloquear un lugar vacío.
- Un lugar bloqueado no puede reservarse.
- El bloqueo funciona como capacidad temporalmente no disponible, sin ocupante.
- No se puede bloquear directamente un lugar ocupado.
- Al desbloquear un lugar, se aplican las reglas normales de promoción si existe lista de espera.

## 10. Panel administrativo

Debe mostrar:

- Fecha y estado de la función.
- Mapa completo.
- Cantidad de lugares disponibles y ocupados.
- Ocupantes del piso.
- Lista de espera ordenada.
- Titulares y reservas de invitados.

Acciones requeridas:

- Abrir o cerrar reservas.
- Mover una persona.
- Cancelar una reserva.
- Bloquear o desbloquear un lugar.
- Reordenar la lista de espera.

La creación manual de reservas por parte del administrador queda fuera de esta iteración.

## 11. Criterios de aceptación

La iteración estará terminada cuando:

- Un enlace de invitación pueda utilizarse una sola vez.
- Un miembro invitado pueda registrarse e ingresar con Google.
- El admin pueda crear y abrir una función.
- Un miembro pueda reservar exactamente un lugar para sí mismo.
- Pueda agregar un único `+1`, registrado o mediante un nombre libre obligatorio.
- Ningún miembro registrado pueda aparecer dos veces en la función.
- Ningún lugar pueda tener dos ocupantes.
- La lista se habilite al agotarse la capacidad.
- Nunca pueda superar cinco personas.
- Las promociones automáticas respeten las reglas definidas.
- La cancelación del titular también cancele al `+1`.
- El admin pueda consultar y gestionar la ocupación.
- La función cerrada pueda verse, pero no modificarse por miembros.
- La experiencia principal funcione correctamente desde un teléfono.

## 12. Fuera de alcance

- Pagos o transferencias.
- Menú del día.
- Confirmación de asistencia.
- Recordatorios y notificaciones.
- Ratings.
- Catálogo histórico visible.
- Configuración personalizada de la sala.
- Reservas recurrentes.
- Aplicaciones nativas.
- Registro con contraseña o Magic Link.

## 13. Restricciones técnicas

- Aplicación web responsive y mobile-first.
- Next.js/React con TypeScript.
- Despliegue en Vercel.
- Firebase Authentication con Google.
- Cloud Firestore en la región `southamerica-west1` (Santiago).
- Firebase Admin SDK para todas las lecturas y escrituras de datos.
- Zona horaria: `America/Argentina/Mendoza`.
- Las reglas críticas deben validarse en el servidor y mediante transacciones atómicas de Firestore, no solamente en la interfaz.
- El navegador no accede directamente a los datos del club; las reglas de Firestore bloquean las lecturas y escrituras públicas.

## 14. Implementación por vertical slicing

1. **Acceso privado:** el admin genera una invitación y un miembro entra con Google.
2. **Primera reserva:** el admin crea una función y un miembro reserva un asiento.
3. **Gestión personal:** el miembro cambia o cancela su lugar.
4. **Invitado:** el miembro busca a otro miembro y reserva su `+1`.
5. **Piso y espera:** se completa la capacidad y funciona la lista de espera.
6. **Promociones:** una cancelación ejecuta correctamente la cadena automática.
7. **Administración:** mapa, movimientos, bloqueos, cancelaciones y orden de espera.
8. **Cierre y robustez:** función cerrada, concurrencia, mobile y estados de error.
9. **La cartelera:** el admin propone películas para una función, los miembros votan y el mapa se habilita después del voto.

Este orden permite entregar y probar valor real en cada slice, sin tener que completar primero toda la infraestructura o todas las pantallas.

## 15. Slice 9 — La cartelera

Antes de seleccionar lugares, el club puede votar qué película verá en una función futura.

### Configuración administrativa

- Solo un administrador crea la cartelera.
- Cada votación pertenece a una función concreta en estado borrador.
- Se cargan manualmente entre tres y cinco películas.
- Cada película incluye título, año, dirección y una breve sinopsis.
- Solo puede haber una votación abierta al mismo tiempo.
- El borrador se puede editar; una vez abierto queda inmutable.
- Al abrir la votación también se abren las reservas de la función asociada.
- La votación tiene una fecha y hora de cierre en `America/Argentina/Mendoza`, siempre anterior a la función.
- El administrador puede cerrarla antes o cancelarla. Una cancelación convierte la función en especial y elimina la obligación de votar.
- Una función especial puede abrirse directamente, sin cartelera.

### Voto de miembros

- Cada miembro, incluido el administrador, puede aprobar una, varias o todas las opciones.
- Debe seleccionar por lo menos una película.
- Puede cambiar su selección mientras la votación esté abierta.
- Los invitados externos (`+1`) no votan.
- Después del primer voto se muestran resultados parciales agregados, nunca nombres de votantes.
- Un miembro nuevo puede votar mientras la cartelera siga abierta.
- El mapa de lugares se habilita inmediatamente después de votar.
- Quien no votó antes del cierre no puede reservar, salvo que un administrador le conceda una excepción individual.
- Un miembro habilitado puede reservar su `+1` con las reglas normales.

### Cierre y resultado

- No existe un mínimo de votos.
- Una ganadora única se asigna a la misma función y no crea otro borrador.
- Si las opciones más votadas empatan, el administrador elige solamente entre ellas.
- Si nadie votó, el administrador elige entre todas las opciones.
- Las reservas hechas durante la votación se conservan y continúan siendo modificables o cancelables.
- Por ahora se muestra únicamente la última película ganadora.
- No se envían avisos por email ni WhatsApp.
