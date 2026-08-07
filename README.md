# Pochoclo Club

Aplicación web privada y mobile-first para reservar lugares en las funciones de Pochoclo Club.

## Estado

Están implementados los **slices 1, 2, 3, 4, 5, 6 y 7** del [PRD](./PRD.md):

- primer administrador mediante un email configurado;
- acceso con Google usando Firebase Authentication;
- sesiones seguras mediante cookies `HttpOnly` creadas por Firebase Admin;
- lotes de invitaciones individuales;
- tokens aleatorios de 256 bits almacenados únicamente como SHA-256;
- vencimiento a los 30 días, revocación y consumo de un solo uso;
- alta atómica del miembro mediante transacciones de Firestore;
- autorización administrativa validada nuevamente contra Firestore.
- creación manual de funciones en estado borrador;
- apertura atómica de una sola función a la vez;
- mapa fijo con doce asientos y dos lugares de piso visibles;
- reserva personal de un asiento mediante una transacción atómica;
- nombres de ocupantes visibles solamente para miembros autenticados;
- protección contra dos ocupantes en un asiento y dos reservas para una persona.
- cambio de asiento personal sin liberar el anterior hasta asegurar el nuevo;
- cancelación de la reserva personal y liberación del asiento en una sola operación.
- un único `+1` por titular, con nombre libre obligatorio;
- sugerencias por nombre cuando el `+1` ya es miembro, sin exponer emails;
- reserva, cambio y cancelación del asiento del `+1`;
- cancelación conjunta del `+1` cuando el titular cancela su reserva.
- reserva de los doce asientos y los dos espacios de piso;
- lista de espera individual con un máximo transaccional de cinco personas;
- posiciones ordenadas para titulares e invitados;
- ingreso y salida de la espera para el miembro o solamente su `+1`.
- promoción del ocupante más antiguo del piso cuando se libera un asiento;
- promoción de la primera persona en espera al espacio de piso liberado;
- cadenas completas para cancelaciones que liberan uno o dos lugares;
- actualización conjunta de mapa, reservas, `+1`, espera y contador.
- panel administrativo con ocupación completa, titulares e invitados;
- movimiento y cancelación de cualquier reserva por un administrador;
- bloqueo y desbloqueo transaccional de lugares vacíos;
- promoción automática al recuperar capacidad mediante un desbloqueo;
- reordenamiento y eliminación administrativa de personas en espera.
- cierre atómico de reservas sin borrar la distribución de la función;
- visualización de la función cerrada en modo de solo lectura;
- apertura de una nueva función después de cerrar la anterior.
- chequeo de concurrencia contra Firestore real para reservas, espera, promociones y bloqueos.

El slice 8 está en progreso: queda la revisión de uso desde pantallas mobile.

## Tecnología

- Next.js 16, React 19 y TypeScript.
- Firebase Authentication con Google.
- Cloud Firestore.
- Firebase Admin SDK en el servidor.
- Vercel para el despliegue de la aplicación.

## Requisitos

- Node.js 22 o posterior.
- Un proyecto de Firebase con Google habilitado en Authentication.
- Una base de Cloud Firestore.
- Una cuenta de servicio de Firebase Admin.

## Configuración local

1. Instalá las dependencias:

   ```bash
   npm install
   ```

2. Copiá `.env.example` como `.env.local` y completá la configuración de la aplicación web de Firebase.

3. Descargá la llave de la cuenta de servicio desde:

   ```text
   Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada
   ```

   Guardala fuera del control de versiones y configurá su ruta absoluta en `GOOGLE_APPLICATION_CREDENTIALS`.

4. En Firebase Authentication, agregá `localhost` a **Dominios autorizados**.

5. Iniciá la aplicación:

   ```bash
   npm run dev
   ```

No hay migraciones: las colecciones se crean al usar cada parte de la aplicación por primera vez.

## Primer ingreso

El primer acceso con la cuenta indicada en `INITIAL_ADMIN_EMAIL` crea el administrador. Después puede entrar en `/admin/invitaciones`, generar enlaces y enviarlos a futuros miembros. Desde `/admin/funciones` puede crear la próxima función como borrador y abrir sus reservas.

Las principales colecciones son:

- `members`: perfiles y roles del club;
- `memberEmails`: índice hasheado que evita repetir personas;
- `invitations`: invitaciones hasheadas, revocaciones y consumos.
- `screenings`: funciones y, dentro de cada una, sus reservas y lugares ocupados;
- `screenings/{id}/plusOnes`: relación entre cada titular y su único invitado;
- `screenings/{id}/waitlist`: personas ordenadas en espera;
- `screenings/{id}/blocks`: lugares temporalmente no disponibles;
- `screenings/{id}/state/waitlist`: contador transaccional que impide superar cinco personas;
- `system/openScreening`: puntero único a la función visible, que impide abrir dos funciones simultáneas y conserva la última función cerrada en modo lectura.

## Verificación

```bash
npm run check
```

El comando ejecuta ESLint, TypeScript, tests y el build de producción.

La prueba de concurrencia real se ejecuta por separado:

```bash
npm run test:concurrency
```

Requiere que no haya una función real abierta. Crea funciones temporales, ejecuta operaciones simultáneas, restaura la función que estaba visible y comprueba que los fixtures hayan sido eliminados.

## Decisiones de seguridad

- El login exige un correo verificado por Google.
- El ID token de Firebase se intercambia por una cookie de sesión `HttpOnly`, `SameSite=Lax`.
- El endpoint de sesión exige un token CSRF, un origen válido y un acceso reciente.
- El alta lee y modifica miembro, email e invitación dentro de una transacción de Firestore.
- La apertura y cada reserva vuelven a validar su estado dentro de una transacción de Firestore.
- Cada reserva crea a la vez un documento por persona y otro por lugar, preservando ambas unicidades.
- Los cambios y cancelaciones modifican la reserva y la ocupación como una única transacción atómica.
- El ingreso a espera verifica los catorce lugares y bloquea un contador compartido dentro de la misma transacción.
- Cada cancelación calcula y ejecuta toda su cadena de promociones dentro de una única transacción.
- Los movimientos, bloqueos, desbloqueos y cambios de prioridad administrativos vuelven a validar la función y conservan la capacidad dentro de transacciones.
- El cierre cambia el estado y conserva la función visible dentro de una única transacción; todas las mutaciones posteriores vuelven a rechazarla desde el servidor.
- Las reglas de Firestore niegan todo acceso directo desde el navegador; únicamente el servidor usa Firebase Admin.
- Los Server Actions vuelven a leer el miembro y su rol desde Firestore.
- La llave de Firebase Admin vive en `.secrets`, carpeta excluida de Git.
