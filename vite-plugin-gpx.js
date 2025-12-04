import toGeoJSON from "@mapbox/togeojson";
import { basename } from "node:path";
import { readFile } from "node:fs/promises";
import { DOMParser } from "@xmldom/xmldom";

export function gpxPlugin() {
  let basePath;
  const gpxPaths = new Map();
  return {
    name: "vite-plugin-gpx",
    configResolved(cfg) {
      const viteConfig = cfg;
      basePath = (viteConfig.base?.replace(/\/$/, "") || "") + "/@gpx/";
    },
    async load(id) {
      if (!/\.gpx$/.test(id)) return null;

      const srcURL = new URL(id, "file://");
      const fileContents = await readFile(decodeURIComponent(srcURL.pathname));

      gpxPaths.set(basename(srcURL.pathname), id);

      let src;
      if (!this.meta.watchMode) {
        const handle = this.emitFile({
          name: basename(srcURL.pathname),
          source: fileContents,
          type: "asset",
        });

        src = `__VITE_ASSET__${handle}__`;
      } else {
        src = basePath + basename(srcURL.pathname);
      }

      // Call processing code
      const xml = new DOMParser().parseFromString(fileContents.toString());
      const geoJSON = toGeoJSON.gpx(xml);

      return {
        code: `export default ${JSON.stringify(geoJSON)}`,
      };
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith(basePath)) {
          const [, id] = req.url.split(basePath);

          const gpxPath = gpxPaths.get(id);

          if (!gpxPath)
            throw new Error(
              `gpx cannot find GPX file with id "${id}" this is likely an internal error. Files are ${JSON.stringify(
                gpxPaths,
              )}`,
            );

          res.setHeader("Content-Type", "application/gpx+xml");
          res.setHeader("Cache-Control", "max-age=360000");
          const buffer = await readFile(gpxPath);
          const contents = buffer.toString();
          return res.end(contents);
        }

        next();
      });
    },
  };
}
