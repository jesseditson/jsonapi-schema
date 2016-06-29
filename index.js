var path = require('path')
var pluralize = require('pluralize')
var loadSchemas = require('./lib/loadSchemas')

/**
 * Public
 */

/**
 * JSONAPI
 * Initialize a parser generator with a dictionary of schemas and a base URL.
 *
 * @param  {object} schemas  A dictionary of schemas that will be available at this endpoint
 * @param  {string} baseURL  A path to prepend to link URLs
 * @return {function}        A JSONAPIParser function for creating a parse method
 */
module.exports = function JSONAPI(schemas, baseURL) {
  if (!schemas) throw new Error('You must provide a schema hash when instantiating JSONAPI.')
  /**
   * JSONAPIParser
   * call with a schema type to create a toJSONAPI function
   *
   * @param {string} type      The name of the schema to parse JSON into
   * @return {function}        A JSONAPIParser function for creating a parse method
   */
  return function JSONAPIParser(type) {
    var schema = schemas[type]
    if (!schema) throw new Error(`No schema found for type ${type}.`)
    /**
     * toJSONAPI
     * Serialize an object to a JSONAPI-compatible response
     *
     * @param  {object} obj      Either a single object, or an array of flat objects from the database
     * @param  {object} info     Additional info to build the response with. Can contain the following keys:
     * - [included]    name:data pairs of flat objects from the databases to include in the response (if part of a relationship)
     * - [links]       Additional links to append to the `links` key
     * - [defaults]    Default key-value pairs to append to every returned item
     * @return {object}          A JSONAPI-compatible object to send back to the client
     */
    return function toJSONAPI(obj, info) {
      info = info || {}
      if (!info.links) info.links = {}
      baseURL = baseURL || ''
      var defaults = info.defaults
      var resp = {
        links: Object.assign(info.links, {
          self: path.join(baseURL, info.links.self || type)
        }),
        data: applyTransform(obj, i => {
          var item = toJSONAPIData(type, i, schema, baseURL)
          var relationships = getRelationships(type, item, info.included, schemas, baseURL, defaults)
          if (Object.keys(relationships).length) item.relationships = relationships
          return item
        })
      }
      if (info.links.related) {
        resp.links.related = path.join(baseURL, info.links.related)
      }
      if (info.included) {
        resp.included = Object.keys(info.included).map(type => {
          return applyTransform(info.included[type], i => {
            var item = toJSONAPIData(type, i, schemas[type], baseURL)
            var relationships = getRelationships(type, item, info.included, schemas, baseURL, defaults)
            if (Object.keys(relationships).length) item.relationships = relationships
            return item
          })
        }).reduce((a, items) => a.concat(items), [])
      }
      if (info.meta) resp.meta = info.meta
      return resp
    }
  }
}

/**
 * loadSchemas
 * load schema files from a folder and return a dictionary of schemas
 *
 * @param {string} schemasFolder   A path to a folder to load schemas from
 * @return {object}                A dictionary of schemas
 */
module.exports.loadSchemas = loadSchemas

/**
 * Private
 */

function applyTransform(obj, transform) {
  if (Array.isArray(obj)) {
    return obj.map(transform)
  } else {
    return transform(obj)
  }
}

function getRelationships(type, parent, included, schemas, baseURL, defaults) {
  var schema = schemas[type]
  if (!schema) throw new Error(`You included a ${type} object but no schema for it was found.`)
  return Object.keys(schema).reduce((o, p) => {
    var property = schema[p]
    if (property && property.relationship) {
      o[p] = {
        links: {
          self: path.join(baseURL, parent.type, String(parent.id), 'relationships', p),
          related: path.join(baseURL, parent.type, String(parent.id), p)
        }
      }
      if (property.relationship === 'belongsTo') {
        var idKey = property.foreignKey || `${p}_id`
        var attributes = parent.attributes || {}
        if (defaults) {
          for (var d in defaults) {
            if (attributes[d]) attributes[d] = defaults[d]
          }
        }
        var itemId = attributes[idKey]
        if (itemId) o[p].data = toJSONAPIData(property.type, { id: itemId }, null, baseURL, true)
      } else if (property.relationship === 'hasMany' && included && included[property.type]) {
        var includeType = property.type
        var foreignKey = property.foreignKey || `${pluralize(type, 1)}_id`
        if (property.through) {
          var throughSchema = schemas[property.through]
          var throughKey = property.foreignKey || `${pluralize(p, 1)}`
          if (!throughSchema[throughKey]) throw new Error(`${type} specified a ${p} relationship through the ${property.through} table, but the ${property.through} schema does not define a ${throughKey} property.`)
          if (!throughSchema[throughKey].type) throw new Error(`${type} specified a ${p} relationship through the ${property.through} table, but the ${throughKey} property does not define a valid type.`)
          includeType = throughSchema[throughKey].type
        }
        var items = included[includeType].filter(i => {
          return i[foreignKey] === parent.id
        })
        o[p].data = applyTransform(items, i => {
          return toJSONAPIData(property.type, { id: i.id }, null, baseURL, true)
        })
      }
    }
    return o
  }, {})
}

function toJSONAPIData(type, obj, schema, baseURL, sparse) {
  if (!obj) return null
  var resp = {
    type: type,
    id: obj.id
  }
  if (!sparse) {
    resp.links = {
      self: `${baseURL}/${type}/${obj.id}`
    }
    var atts = Object.keys(obj).filter(k => k !== 'id')
    if (atts.length) {
      resp.attributes = atts.reduce((o, k) => {
        o[k] = obj[k]
        return o
      }, {})
    }
  }
  return resp
}
