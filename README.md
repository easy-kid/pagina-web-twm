# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Integración con la API

Configura `VITE_API_URL` en `.env` para indicar la URL base del backend. El cliente HTTP agrega el JWT obtenido por `POST /token` a las solicitudes protegidas.

Los servicios de `src/services/` consumen:

- `/sites` y `/sites/{site_id}` para listar centros y cargar su detalle.
- `/sensors` y `/sensors/{sensor_id}` para listar, filtrar por estado y consultar sensores.
- `/measurements` para consultar mediciones por sensor o centro (se debe indicar al menos uno), con filtros de fecha y selección de sensor dentro de cada centro.
- `/measurements/overview` para consultar datos agregados para gráficos.
- `/interventions` para listar y abrir intervenciones. La API no permite editar ni eliminar intervenciones; abrirlas se realiza con `POST`.

El dashboard combina el estado de sensores con la tendencia de mediciones y las intervenciones recientes. Las vistas de la aplicación también están disponibles en `/sites`, `/sensors`, `/measurements`, `/measurements/overview` y `/interventions`. Las mediciones del sensor también se muestran como gráfico en su página de detalle. Las intervenciones se registran en el backend; el autor se obtiene del JWT.
