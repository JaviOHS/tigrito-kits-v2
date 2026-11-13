export function normalizeFilterRules(filterConfig) {
  if (Array.isArray(filterConfig)) return filterConfig

  if (filterConfig && typeof filterConfig === 'object') {
    return Object.entries(filterConfig).map(([key, rule]) => ({
      key,
      ...rule,
    }))
  }

  return []
}

function isUnsetValue(value, rule) {
  if (value === undefined || value === null || value === '') return true

  return rule.allValue !== undefined && value === rule.allValue
}

function evaluateSelectRule(item, rule, value) {
  if (isUnsetValue(value, rule)) return true

  return item?.[rule.field] === value
}

function evaluateToggleRule(item, rule, value) {
  if (!value) return true

  return item?.[rule.field] === (rule.activeValue ?? true)
}

function evaluateSearchRule(item, rule, value) {
  const query = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!query) return true

  const fields = Array.isArray(rule.fields) ? rule.fields : []

  return fields.some((field) =>
    String(item?.[field] ?? '')
      .toLowerCase()
      .includes(query),
  )
}

const RULE_EVALUATORS = Object.freeze({
  select: evaluateSelectRule,
  toggle: evaluateToggleRule,
  search: evaluateSearchRule,
})

/**
 * Pure filter engine. Rules are evaluated by their declarative `type`, so new
 * select/toggle/search filters only require configuration changes.
 */
export function applyCatalogFilters(
  items,
  filterState = {},
  filterConfig = [],
) {
  if (!Array.isArray(items)) return []

  const rules = normalizeFilterRules(filterConfig)

  return items.filter((item) => {
    if (!item) return false

    return rules.every((rule) => {
      if (!rule || rule.enabled === false || !rule.key) return true

      const evaluate = RULE_EVALUATORS[rule.type]
      if (typeof evaluate !== 'function') return true

      return evaluate(item, rule, filterState?.[rule.key])
    })
  })
}
