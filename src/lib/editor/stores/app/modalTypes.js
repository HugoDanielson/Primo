import {ComponentEditor,SitePages,CSS,Fields,HTML,Dialog} from '../../views/modal'

export const modalTypes = {
  'COMPONENT_EDITOR' : {
    component: ComponentEditor,
    header: {
      title: 'Create Component',
      icon: 'fas fa-code'
    },
  },
  'SITE_PAGES' : {
    component: SitePages,
    header: {
      title: 'Pages',
      icon: 'fas fa-th-large'
    },
  },
  'FIELDS' : {
    component: Fields,
    // header: {
    //   title: 'Page Data',
    //   icon: 'fas fa-database'
    // },
  },
  'STYLES' : {
    component: CSS,
    header: {
      title: 'CSS',
      icon: 'fab fa-css3'
    }
  },
  'WRAPPER' : {
    component: HTML,
    header: {
      title: 'HTML',
      icon: 'fab fa-html5'
    }
  },
  'DIALOG' : {
    component: Dialog
  },
}