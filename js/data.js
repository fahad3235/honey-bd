/* Honey BD \u2014 fixed option lists (no prices, no preset data).
 * All money and amounts are entered by the user; the app ships empty. */
'use strict';

const HIVE_TYPES = ['box', 'log', 'topbar'];
const STRENGTHS = ['weak', 'moderate', 'strong'];
const STATUSES = ['active', 'queenless', 'inactive'];
const QUEEN = ['seen', 'not-seen', 'unsure'];
const BROOD = ['none', 'low', 'good', 'full'];
const STORES = ['low', 'ok', 'full'];
const TEMPERAMENT = ['calm', 'normal', 'aggressive'];
const EXPENSE_CATEGORIES = ['feed', 'equipment', 'medicine', 'transport', 'other'];

if (typeof module !== 'undefined') {
  module.exports = {
    HIVE_TYPES, STRENGTHS, STATUSES, QUEEN, BROOD, STORES,
    TEMPERAMENT, EXPENSE_CATEGORIES,
  };
}

/* Browser global: app.js reads DATA.* (classic scripts share scope). */
var DATA = {
  HIVE_TYPES, STRENGTHS, STATUSES, QUEEN, BROOD, STORES,
  TEMPERAMENT, EXPENSE_CATEGORIES,
};
