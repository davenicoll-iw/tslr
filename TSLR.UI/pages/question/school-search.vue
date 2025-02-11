<template>
  <section class="container">
    <div class="govuk-width-container">
      <div class="govuk-grid-row">
        <div class="govuk-grid-column-two-thirds">
          <div 
            v-if="error" 
            class="govuk-error-summary" 
            aria-labelledby="error-summary-title" 
            role="alert"
            data-module="error-summary">
            <h2 id="error-summary-title" class="govuk-error-summary__title">
              There is a problem
            </h2>
            <div class="govuk-error-summary__body">
              <ul class="govuk-list govuk-error-summary__list">
                <li>
                  <a href="#when-did-you-qualify-error">You must select a school</a>
                </li>
              </ul>
            </div>
          </div>
          <form 
            id="school-teach-form"
            action="/validator/school-search"
            onsubmit="return false;">
            <div
              :class="{'govuk-form-group--error': error}"
              class="govuk-form-group">
              <fieldset class="govuk-fieldset govuk-form-group">
                <legend class="govuk-fieldset__legend govuk-fieldset__legend--xl">
                  <h1 class="govuk-fieldset__heading">
                    Where have you taught since 6 April 2018?
                  </h1>
                </legend>
                <details class="govuk-details" tabindex="4">
                  <summary class="govuk-details__summary">
                    <span class="govuk-details__summary-text">
                      You've taught at more than one school
                    </span>
                  </summary>
                  <div class="govuk-details__text">
                    For now, enter one of the schools you've taught at. You can check another school when you've finished.
                  </div>
                </details>
                <span v-if="error" id="where-did-you-teach-error" class="govuk-error-message">
                  You must select a school
                </span>
                <label class="govuk-label" for="check-school-name">Enter the school name</label>
                <no-ssr>
                  <div v-if="jsEnabled()" id="search-container">
                    <div class="search-bar govuk-form-group">
                      <input 
                        v-clickoutside="removeDropdown"
                        id="name"
                        ref="search" 
                        v-model="searchTerm" 
                        class="govuk-input"
                        type="text" 
                        autocomplete="off"
                        maxlength="300"
                        tabindex="5"
                        @input="onSearch"
                        @keyup.down="onDropdownItemShift(1)"
                        @keyup.up="onDropdownItemShift(-1)"
                        @keydown.enter="onSelectedSchoolEnter()"
                        @keydown.tab="removeDropdown">
                    </div>
                    <div v-if="searchTermActive()" ref="dropdown" class="search-results">
                      <div
                        v-for="(school, index) in schools"
                        :id="'school-' + index" 
                        :key="school.id"
                        :index="index" 
                        :class="{'active-item': school.isActive}"
                        class="search-result"
                        @mouseover="onDropdownItemShiftHover(index)"
                        @mouseleave="onDropdownMouseOut(index)"
                        @click="onSelectedSchool(school)">
                        <div class="school-name">
                          <span>{{ school.name }}</span> <span class="closed-tag">{{ closeTag(school.closeDate) }}</span>
                        </div>
                        <div class="school-caption">
                          <span>{{ getLabel(school) }}</span>
                        </div>
                        <a :href="'#school-' + index" />
                      </div>
                    </div>
                  </div>
                </no-ssr>  
                <noscript>
                  <input class="govuk-input" name="query_school" type="text" autocomplete="off" list="schools" maxlength="300" tabindex="5">
                </noscript>
              </fieldset>
            </div>
            <noscript>
              <input type="submit" value="Continue" class="govuk-button" tabindex="6"></input>
            </noscript>
            <no-ssr>
              <button 
                v-if="jsEnabled()"
                type="button"
                class="govuk-button"
                tabindex="6"
                @click="submit()"
                @enter="submit()">
                Continue
              </button>
            </no-ssr>
          </form> 
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'

export default {
  watchQuery: true,
  directives: {
    clickoutside: {
      bind: function(el, binding, vNode) {
        // Provided expression must evaluate to a function.
        if (typeof binding.value !== 'function') {
          const compName = vNode.context.name
          let warn = `[Vue-click-outside:] provided expression '${
            binding.expression
          }' is not a function, but has to be`
          if (compName) {
            warn += `Found in component '${compName}'`
          }

          console.warn(warn)
        }
        // Define Handler and cache it on the element
        const bubble = binding.modifiers.bubble
        const handler = e => {
          if (bubble || (!el.contains(e.target) && el !== e.target)) {
            binding.value(e)
          }
        }
        el.__vueClickOutside__ = handler

        // add Event Listeners
        document.addEventListener('click', handler)
      },

      unbind: function(el, binding) {
        // Remove Event Listeners
        document.removeEventListener('click', el.__vueClickOutside__)
        el.__vueClickOutside__ = null
      }
    }
  },
  head: {
    title: 'The school you taught at'
  },

  async asyncData({ route }) {
    let invalid = false

    if (route.query.invalid) {
      invalid = true
    }
    return {
      error: invalid
    }
  },
  data: function() {
    return {
      searchTerm: '',
      initialSearchTerm: '',
      currentDropdownIndex: -1,
      currentDropdownItem: {},
      arrowActive: false,
      schools: [],
      error: false,
      selectedSchool: {
        name: null
      },
      isLoading: false
    }
  },

  methods: {
    jsEnabled() {
      return process.client
    },

    async onSearch() {
      this.resetQuery()

      if (this.searchTerm && this.searchTerm.trim().length > 0) {
        await this.getSearchResults(this.searchTerm.trim())
      }
    },

    getSearchResults: _.debounce(async function(searchTerm) {
      this.schools = await axios
        .get(`/api/Schools/search?name=${escape(searchTerm)}`)
        .then(res => {
          return res.data
        })
        .catch(err => {
          console.log('Error: ' + err)
        })
      this.schools.map(s => (s.isActive = false))
    }, 350),

    onSelectedSchool(school) {
      if (this.searchTerm === '') return

      this.searchTerm = school.name
      this.selectedSchool = school
    },

    onSelectedSchoolEnter() {
      if (this.searchTerm === '' || this.schools.length === 0) return
      this.searchTerm = this.schools[this.currentDropdownIndex].name
      this.selectedSchool = this.schools[this.currentDropdownIndex]
    },

    searchTermActive() {
      return this.schools.length > 0 && this.searchTerm.trim().length > 0
    },

    getLabel(school) {
      if (school) {
        let label = ''
        if (school.street && school.street.length > 0) {
          label = `${label}${school.street}`
        }
        if (school.town && school.town.length > 0) {
          label = `${label}, ${school.town}`
        }
        if (school.postCode && school.postCode.length > 0) {
          label = `${label}, ${school.postCode}`
        }
        return label
      }
      return ''
    },

    onDropdownItemShift(shiftValue) {
      this.arrowActive = true
      if (this.currentDropdownIndex === -1 && shiftValue === -1) return false

      if (
        !this.searchTerm ||
        this.searchTerm.trim().length === 0 ||
        this.schools === undefined ||
        this.schools.length === 0 ||
        (this.currentDropdownIndex + 1 >= this.schools.length &&
          shiftValue === 1)
      )
        return

      let schools = this.schools
      this.schools = []
      let oldDropdownIndex = this.currentDropdownIndex
      this.currentDropdownIndex += shiftValue

      if (oldDropdownIndex > -1) schools[oldDropdownIndex].isActive = false
      if (this.currentDropdownIndex > -1)
        schools[this.currentDropdownIndex].isActive = true

      this.schools = schools
      let scrollHeight = this.$refs.dropdown.scrollHeight
      this.$refs.dropdown.scrollTop = 62 * this.currentDropdownIndex
    },

    onDropdownItemShiftHover(itemIndex) {
      if (this.arrowActive) {
        this.arrowActive = false
        return
      }
      if (this.schools === undefined || this.schools.length === 0) return

      let schools = this.schools
      this.schools = []

      if (this.currentDropdownIndex > -1)
        schools[this.currentDropdownIndex].isActive = false

      this.currentDropdownIndex = itemIndex
      schools[itemIndex].isActive = true
      this.schools = schools
    },

    onDropdownMouseOut(itemIndex) {
      let schools = this.schools
      this.schools = []
      schools[itemIndex].isActive = false
      this.schools = schools
    },

    submit() {
      this.$router.push({
        path: '/validator/school-search',
        query: { id: this.selectedSchool.id }
      })
    },

    closeTag(closeDate) {
      if (closeDate === undefined || closeDate.length === 0) return ''
      const year = parseInt(closeDate.substr(6, 4))
      const month = parseInt(closeDate.substr(3, 2)) - 1
      const day = parseInt(closeDate.substr(0, 2))
      let formattedDate = new Date(year, month, day)

      return formattedDate <= new Date() ? '(Closed)' : ''
    },

    resetQuery() {
      if (this.$refs.dropdown !== undefined) this.$refs.dropdown.scrollTop = 0
      if (this.currentDropdownIndex > -1 && this.schools.length > 0)
        this.schools[this.currentDropdownIndex].isActive = false

      this.currentDropdownIndex = -1
    },

    removeDropdown() {
      this.schools = []
      this.resetQuery()
    }
  }
}
</script>

<style lang="scss">
#search-container {
  .search-bar {
    margin-bottom: 0;
  }

  .search-results {
    -webkit-box-shadow: rgba(11, 12, 12, 0.256863) 0 2px 6px;
    box-shadow: rgba(11, 12, 12, 0.256863) 0 2px 6px;
    width: 100%;
    max-height: 342px;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    border-top: 0;
    color: #0b0c0c;
    background-color: #fff;

    .search-result {
      font-family: 'nta', Arial, sans-serif;
      font-size: 1.1875rem;
      line-height: 1.31579;
      display: block;
      position: relative;
      border-bottom: solid #bfc1c3;
      border-width: 1px 0;
      cursor: pointer;
      padding: 10px;

      &:nth-child(even) {
        background-color: #fafafa;
      }

      .school-caption {
        font-size: 1rem;
        line-height: 1.25;
        display: block;
        font-family: 'nta', Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-weight: 400;
        font-size: 14px;
        font-size: 0.875rem;
        line-height: 1.14286;
        color: #6f777b;

        &:hover {
          color: inherit;
        }
      }
    }

    .search-result.active-item {
      border-color: #005ea5;
      background-color: #005ea5;
      border-color: #005ea5;
      outline: none;
      color: #fff;
    }

    .active-item {
      .school-caption,
      .closed-tag {
        color: #fff;
        opacity: 1;
      }
    }

    .closed-tag {
      color: #6f777b;
      opacity: 0.8;
    }
  }
}
</style>
