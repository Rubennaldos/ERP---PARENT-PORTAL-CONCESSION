# 🚀 Resumen de Actualización - Lima Café 28 (v1.0.8 BETA)
**Fecha:** 04 de Enero, 2026
**Cliente:** Lima Café 28
**Desarrollado por:** ARQUISIA Soluciones

---

## 🏗️ Nueva Arquitectura Multisede
Se ha implementado un sistema robusto de aislamiento de datos por sede, garantizando que cada usuario vea únicamente la información que le corresponde.

*   **Aislamiento de Datos:** Los operadores de una sede (ej. Nordic) ya no pueden ver estudiantes ni transacciones de otras sedes (ej. Jean LeBouch).
*   **Gestión Centralizada:** El **Admin General** mantiene el control total, pudiendo supervisar todas las sedes o filtrar por una específica.

## 👥 Nuevos Roles y Control de Acceso Granular
Se han definido y configurado 4 nuevos perfiles operativos con permisos específicos:

1.  **Supervisor de Red:** Auditor con visión global de todas las sedes.
2.  **Gestor de Unidad:** Administrador responsable de una sede específica.
3.  **Operador de Caja:** Perfil enfocado en el Punto de Venta (POS) y cobros.
4.  **Operador de Cocina:** Perfil para la gestión de menús y entregas en comedor.

> **Control Admin:** El Admin General puede activar/desactivar módulos y permisos específicos para cada usuario de forma individual.

## 💰 Módulo de Cobranzas Profesional (Completo)
Se ha desarrollado un sistema integral de facturación y cobranza:

*   **Dashboard de Cobranzas:** Resumen en tiempo real de montos pendientes, cobros del día, períodos abiertos y ranking de deudores.
*   **Gestión de Períodos:** Creación de períodos de cobranza (semanales/mensuales) con control de visibilidad para los padres.
*   **Pasarela de Cobro Manual:** Registro de pagos (totales o parciales) con detalle de método de pago (Yape, Plin, Transferencia, etc.) y número de operación.
*   **Generación de PDFs Profesionales:** Diseño elegante con logo de Lima Café 28, detalle de consumos y pie de página corporativo.
*   **Integración WhatsApp:** Exportación inteligente para n8n/Whatsender con mensajes personalizados y **tiempos de envío aleatorios (15s - 5min)** para evitar bloqueos.

## 🧪 Modo Demo (Entorno de Pruebas)
Se ha implementado un **Modo Demo** exclusivo para el Admin General:
*   Permite probar todas las funciones de cobranza con datos ficticios.
*   **Seguridad:** Nada de lo realizado en Modo Demo se guarda en la base de datos real.
*   **Simulación:** Ideal para capacitación de personal o pruebas de nuevas funciones.

## 👁️ Modo "Ver Como"
El Admin General ahora puede simular la vista de cualquier rol en cualquier sede sin necesidad de crear cuentas falsas, facilitando la auditoría del sistema.

## 🎨 Mejoras Visuales y UX
*   **Logo Transparente:** Logo de Lima Café 28 optimizado en Login y Splash Screen (sin fondo blanco).
*   **Mensaje de Bienvenida:** Saludo personalizado al iniciar sesión: *"Hola [Nombre], Bienvenido"*.
*   **Footer Corporativo:** Pie de página profesional con versión automática y créditos de desarrollo.
*   **Filtros Globales:** Filtro de sede integrado en la Lista de Ventas y Cobranzas.

---

## 🔗 Enlace de Acceso (Vercel)
**URL:** [https://parent-portal-connect.vercel.app](https://parent-portal-connect.vercel.app)
*(Nota: El sistema está configurado para despliegue automático en cada actualización)*

---
**© 2026 ERP Profesional diseñado por ARQUISIA Soluciones para Lima Café 28 — Versión 1.0.8 BETA**

