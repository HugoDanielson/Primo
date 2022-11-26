import _, { chain as _chain, capitalize as _capitalize } from "lodash-es";
import { processors } from './component'
import { LoremIpsum as lipsum } from "lorem-ipsum/src/index";
import type { Site, Page, Field } from './const'

export async function processCode({ component, buildStatic = true, format = 'esm', locale = 'en' }: { component: any, buildStatic?: boolean, format?: string, locale?: string }) {
  let css = ''
  if (component.css) {
    const { css: res, error } = await processors.css(component.css || '')
    if (error) {
      console.log('ERROR', error)
      return { error }
    } else {
      css = res
    }
  }

  const res = await processors.html({
    component: {
      ...component,
      css
    }, buildStatic, format, locale
  })
  return res
}

export async function processCSS(raw: string): Promise<string> {
  const res = await processors.css(raw) || {}
  if (!res) {
    return ''
  } else if (res.error) {
    console.log('CSS Error:', res.error)
    return raw
  } else if (res.css) {
    return res.css
  }
}

export function convertFieldsToData(fields: any[]): object {
  const parsedFields = fields.map((field) => {
    if (field.type === "group") {
      if (field.fields) {
        field.value = _.chain(field.fields)
          .keyBy("key")
          .mapValues("value")
          .value();
      }
    }
    return field;
  })

  if (!parsedFields.length) return {}

  return _.chain(parsedFields).keyBy("key").mapValues("value").value()
}

// Lets us debounce from reactive statements
export function createDebouncer(time) {
  return _.debounce((val) => {
    const [fn, arg] = val;
    fn(arg);
  }, time);
}

export function wrapInStyleTags(css: string, id: string = null): string {
  return `<style type="text/css" ${id ? `id = "${id}"` : ""}>${css}</style>`;
}

// make a url string valid
export const makeValidUrl = (str: string = ''): string => {
  if (str) {
    return str.replace(/\s+/g, '-').replace(/[^0-9a-z\-._]/ig, '').toLowerCase()
  } else {
    return ''
  }
}


const lorem = new lipsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4
  },
  wordsPerSentence: {
    max: 16,
    min: 4
  }
});
export const LoremIpsum = (nSentences = 1) => {
  return lorem.generateSentences(nSentences)
}


export function hydrateFieldsWithPlaceholders(fields) {
  return fields.map(field => ({
    ...field,
    value: getPlaceholderValue(field)
  }))
}

export function getPlaceholderValue(field: Field) {
  if (field.default) return field.default
  if (field.type === 'repeater') return getRepeaterValue(field.fields)
  else if (field.type === 'group') return getGroupValue(field)
  else if (field.type === 'image') return {
    url: 'https://picsum.photos/600/400?blur=10',
    src: 'https://picsum.photos/600/400?blur=10',
    alt: '',
    size: null
  }
  else if (field.type === 'text') return _capitalize(lorem.generateWords(3))
  else if (field.type === 'content') return lorem.generateSentences(2)
  else if (field.type === 'link') return {
    label: lorem.generateWords(1),
    url: '/'
  }
  else if (field.type === 'url') return '/'
  else {
    console.warn('No placeholder set for field type', field.type)
    return ''
  }

  function getRepeaterValue(subfields) {
    return Array.from(Array(2)).map(_ => _chain(subfields).map(s => ({ ...s, value: getPlaceholderValue(s) })).keyBy('key').mapValues('value').value())
  }

  function getGroupValue(field) {
    return _chain(field.fields).keyBy('key').mapValues((field) => getPlaceholderValue(field)).value()
  }
}

export function hydrateFieldsWithEmptyValues(fields: Array<Field>) {
  return fields.map(field => ({
    ...field,
    value: getPlaceholderValue(field)
  }))
}

export function getEmptyValue(field: Field) {
  if (field.default) return field.default
  if (field.type === 'repeater') return []
  else if (field.type === 'group') return getGroupValue(field)
  else if (field.type === 'image') return {
    url: '',
    src: '',
    alt: '',
    size: null
  }
  else if (field.type === 'text') return ''
  else if (field.type === 'content') return ''
  else if (field.type === 'link') return {
    label: '',
    url: ''
  }
  else if (field.type === 'url') return ''
  else {
    console.warn('No placeholder set for field type', field.type)
    return ''
  }

  function getGroupValue(field) {
    return _chain(field.fields).keyBy('key').mapValues((field) => getPlaceholderValue(field)).value()
  }
}



export function validateSiteStructure(site): Site {

  let validated
  try {
    if (defined_structure(site, ['html'])) validated = convertSite(site)
    else if (defined_structure(site, ['content'])) validated = updateSite(site)
    else validated = null
  } catch (e) {
    console.warn('Site is invalid', site)
    validated = null
  }

  return validated

  function updateSite(site) {
    return {
      ...site,
      fields: convertFields(site.fields),
      symbols: site.symbols.map(symbol => ({
        ...symbol,
        fields: convertFields(symbol.fields)
      }))
    }
  }

  function convertSite(site) {

    const siteContent = {}
    const updated: Site = {
      id: site.id,
      name: site.name,
      pages: convertPages(site.pages, (page) => {
        siteContent[page.id] = page.content
      }),
      code: convertCode(site),
      symbols: convertSymbols(site.symbols),
      fields: convertFields(site.fields, (field) => {
        siteContent[field.id] = field.content
      }),
      content: {
        en: null
      }
    }
    updated.content['en'] = siteContent

    return updated

    function convertPages(pages = [], fn = (_) => { }) {
      return pages.map((page): Page => {
        const pageContent = {}
        const updatedPage = {
          id: page.id,
          name: page.name || page.title || '',
          sections: convertSections(page.sections, (section) => {
            pageContent[section.id] = section.content
          }),
          code: convertCode(page),
          fields: convertFields(page.fields, (field) => {
            pageContent[field.id] = field.content
          }),
          pages: convertPages(page.pages)
        }
        fn({
          id: page.id,
          content: pageContent
        })
        return updatedPage
      })

      function convertSections(sections, cb) {
        return sections.filter(s => s.type !== 'options').map(section => {
          cb({
            id: section.id,
            content: section.value.fields ? _.chain(section.value.fields).keyBy('key').mapValues('value').value() : section.value.html
          })
          return {
            id: section.id,
            type: section.type,
            ...(section.symbolID ? { symbolID: section.symbolID } : {})
          }
        })
      }
    }

    function convertCode(obj) {
      return {
        html: obj.html,
        css: obj.css,
        js: obj.js || ''
      }
    }
  }

}

export function convertSymbols(symbols) {
  return symbols.map(symbol => ({
    type: 'symbol',
    id: symbol.id,
    name: symbol.title || '',
    code: {
      html: symbol.value.html,
      css: symbol.value.css,
      js: symbol.value.js
    },
    fields: convertFields(symbol.value.fields)
  }))
}

export function convertFields(fields = [], fn: Function = () => { }): Array<Field> {
  return fields.map(field => {
    fn({
      id: field.key,
      content: field.value
    })
    return {
      id: field.id,
      key: field.key,
      label: field.label,
      type: field.type,
      fields: convertFields(field.fields),
      options: field.options || {},
      default: field.default || ''
    }
  })
}


// https://stackoverflow.com/questions/24924464/how-to-check-if-object-structure-exists
function defined_structure(obj, attrs) {
  var tmp = obj;
  for (let i = 0; i < attrs.length; ++i) {
    if (tmp[attrs[i]] == undefined)
      return false;
    tmp = tmp[attrs[i]];
  }
  return true;
}