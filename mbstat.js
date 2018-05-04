const sqlite3 = require('sqlite3').verbose()
const VectorTile = require('@mapbox/vector-tile').VectorTile
const Protobuf = require('pbf')
const zlib = require('zlib')
const tilebelt = require('@mapbox/tilebelt')

const _q = v => {
  for(let i = 0; true; i++) {
    if(v / (2 ** i) < 1) return i - 1
  }
}

if (process.argv.length == 2) {
  console.log('Usage: node mbstat.js {mbtiles...}')
  process.exit()
}

for (let i = 2; i < process.argv.length; i++) {
  const db = new sqlite3.Database(process.argv[i], sqlite3.OPEN_READONLY)
  db.each('SELECT * FROM tiles', (err, row) => {
    if (err) return
    const z = row.zoom_level
    const x = row.tile_column
    const y = (1 << z) - row.tile_row - 1
    const size = row.tile_data.length
    const q = _q(size)
    if (q <= 16) return
    const tile = new VectorTile(new Protobuf(zlib.gunzipSync(row.tile_data)))
    let r = {}
    let r2 = {}
    for (const l in tile.layers) {
      r[l] = tile.layers[l].length
    }
    for (const l of ['polygon']) {
      for (let i = 0; i < tile.layers[l].length; i++) {
        const f = tile.layers[l].feature(i)
        r2[f.properties.layer] = (r2[f.properties.layer] === undefined) ? 
          1 : (r2[f.properties.layer] + 1)
        //console.log(JSON.stringify(f.toGeoJSON(x, y, z), null, 2))
      }
    }
    console.log(`${z}/${x}/${y}(${q}) ${JSON.stringify(r)} ${JSON.stringify(r2)}`)
  }, () => {
    db.close()
  })
}
