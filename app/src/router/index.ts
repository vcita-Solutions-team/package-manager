import { createRouter, createWebHistory } from 'vue-router'

const Login = () => import('@/views/Login.vue')
const PackageList = () => import('@/views/PackageList.vue')
const PackageEditor = () => import('@/views/PackageEditor.vue')
const PackageDetail = () => import('@/views/PackageDetail.vue')
const FeatureCatalog = () => import('@/views/FeatureCatalog.vue')
const AppsCatalog = () => import('@/views/AppsCatalog.vue')
const PackageComparison = () => import('@/views/PackageComparison.vue')
const TemplateList = () => import('@/views/TemplateList.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { layout: 'blank', public: true },
    },
    {
      path: '/',
      name: 'packages',
      component: PackageList,
      meta: { title: 'Packages' },
    },
    {
      path: '/packages/new',
      name: 'package-create',
      component: PackageEditor,
      meta: { title: 'Create Package' },
    },
    {
      path: '/packages/:id',
      name: 'package-detail',
      component: PackageDetail,
      meta: { title: 'Package Details' },
    },
    {
      path: '/packages/:id/edit',
      name: 'package-edit',
      component: PackageEditor,
      meta: { title: 'Edit Package' },
    },
    {
      path: '/features',
      name: 'features',
      component: FeatureCatalog,
      meta: { title: 'Feature Catalog' },
    },
    {
      path: '/apps',
      name: 'apps',
      component: AppsCatalog,
      meta: { title: 'Apps Catalog' },
    },
    {
      path: '/templates',
      name: 'templates',
      component: TemplateList,
      meta: { title: 'Templates' },
    },
    {
      path: '/compare',
      name: 'compare',
      component: PackageComparison,
      meta: { title: 'Compare Packages' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public) return true

  // Auth guard disabled for prototype — all pages accessible without login
  // const token = localStorage.getItem('operator_jwt_token')
  // if (!token) return { name: 'login' }

  return true
})

export default router
