import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'

/**
 * LoadProductView imports the read-only product page on demand.
 * 中文：按需加载商品页；参数：无；返回：组件模块 Promise；副作用：加载页面代码，不请求业务数据。
 * Parameters: none. Returns: a component-module promise. Effect: loads route code only.
 */
function loadProductView() {
  return import('@/views/product/ProductListView.vue')
}

/**
 * LoadMallCategoryView imports the read-only mall category page.
 * 中文：按需加载商城类目页；参数：无；返回：组件模块 Promise；副作用：加载页面代码。
 * Parameters: none. Returns: a component-module promise. Effect: loads route code.
 */
function loadMallCategoryView() {
  return import('@/views/mall-category/MallCategoryListView.vue')
}

/**
 * LoadDeliveryView imports the read-only delivery page.
 * 中文：按需加载配送页；参数：无；返回：组件模块 Promise；副作用：加载页面代码。
 * Parameters: none. Returns: a component-module promise. Effect: loads route code.
 */
function loadDeliveryView() {
  return import('@/views/delivery/DeliveryView.vue')
}

/**
 * LoadCityView imports the read-only city page.
 * 中文：按需加载城市页；参数：无；返回：组件模块 Promise；副作用：加载页面代码。
 * Parameters: none. Returns: a component-module promise. Effect: loads route code.
 */
function loadCityView() {
  return import('@/views/city/CityListView.vue')
}

/**
 * LoadOutOfScopeView imports the fallback for routes outside this preview.
 * 中文：按需加载范围外提示；参数：无；返回：组件模块 Promise；副作用：加载页面代码。
 * Parameters: none. Returns: a component-module promise. Effect: loads route code.
 */
function loadOutOfScopeView() {
  return import('@/views/OutOfScopeView.vue')
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AdminLayout,
    children: [
      { path: '', redirect: '/products' },
      { path: 'products', name: 'ProductList', component: loadProductView },
      {
        path: 'mall-categories',
        name: 'MallCategoryList',
        component: loadMallCategoryView,
      },
      { path: 'delivery', name: 'DeliverySettings', component: loadDeliveryView },
      { path: 'cities', name: 'CityList', component: loadCityView },
      {
        path: ':pathMatch(.*)*',
        name: 'OutOfScope',
        component: loadOutOfScopeView,
      },
    ],
  },
]

export const router = createRouter({ history: createWebHistory(), routes })
