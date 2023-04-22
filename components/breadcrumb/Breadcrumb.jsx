import PropTypes from '../_util/vue-types';
import { cloneElement } from '../_util/vnode';
import { filterEmpty, getComponentFromProp, getSlotOptions } from '../_util/props-util';
import warning from '../_util/warning';
import { ConfigConsumerProps } from '../config-provider/configConsumerProps';
import BreadcrumbItem from './BreadcrumbItem';
import Menu from '../menu';

const Route = PropTypes.shape({
  path: PropTypes.string,
  breadcrumbName: PropTypes.string,
  children: PropTypes.array,
}).loose;

const BreadcrumbProps = {
  prefixCls: PropTypes.string,
  routes: PropTypes.arrayOf(Route),
  params: PropTypes.any,
  separator: PropTypes.any,
  itemRender: PropTypes.func,
};

function getBreadcrumbName(route, params) {
  if (!route.breadcrumbName) {
    return null;
  }
  const paramsKeys = Object.keys(params).join('|');
  const name = route.breadcrumbName.replace(
    new RegExp(`:(${paramsKeys})`, 'g'),
    (replacement, key) => params[key] || replacement,
  );
  return name;
}

export default {
  name: 'DBreadcrumb',
  props: BreadcrumbProps,
  inject: {
    configProvider: { default: () => ConfigConsumerProps },
  },
  methods: {
    defaultItemRender({ route, params, routes, paths }) {
      const isLastItem = routes.indexOf(route) === routes.length - 1;
      const name = getBreadcrumbName(route, params);
      return isLastItem ? <span>{name}</span> : <a href={`#/${paths.join('/')}`}>{name}</a>;
    },
    getPath(path, params) {
      path = (path || '').replace(/^\//, '');
      Object.keys(params).forEach(key => {
        path = path.replace(`:${key}`, params[key]);
      });
      return path;
    },

    addChildPath(paths, childPath, params) {
      const originalPaths = [...paths];
      const path = this.getPath(childPath, params);
      if (path) {
        originalPaths.push(path);
      }
      return originalPaths;
    },

    genForRoutes({ routes = [], params = {}, separator, itemRender = this.defaultItemRender }) {
      const paths = [];
      return routes.map(route => {
        const path = this.getPath(route.path, params);

        if (path) {
          paths.push(path);
        }
        // generated overlay by route.children
        let overlay = null;
        if (route.children && route.children.length) {
          overlay = (
            <Menu>
              {route.children.map(child => (
                <Menu.Item key={child.path || child.breadcrumbName}>
                  {itemRender({
                    route: child,
                    params,
                    routes,
                    paths: this.addChildPath(paths, child.path, params),
                    h: this.$createElement,
                  })}
                </Menu.Item>
              ))}
            </Menu>
          );
        }

        return (
          <BreadcrumbItem
            overlay={overlay}
            separator={separator}
            key={path || route.breadcrumbName}
          >
            {itemRender({ route, params, routes, paths, h: this.$createElement })}
          </BreadcrumbItem>
        );
      });
    },
  },
  render() {
    let crumbs;
    const { prefixCls: customizePrefixCls, routes, params = {}, $slots, $scopedSlots } = this;
    const getPrefixCls = this.configProvider.getPrefixCls;
    const prefixCls = getPrefixCls('breadcrumb', customizePrefixCls);

    const children = filterEmpty($slots.default);
    const separator = getComponentFromProp(this, 'separator');
    const itemRender = this.itemRender || $scopedSlots.itemRender || this.defaultItemRender;
    if (routes && routes.length > 0) {
      // generated by route
      crumbs = this.genForRoutes({
        routes,
        params,
        separator,
        itemRender,
      });
    } else if (children.length) {
      crumbs = children.map((element, index) => {
        warning(
          getSlotOptions(element).__ANT_BREADCRUMB_ITEM ||
            getSlotOptions(element).__ANT_BREADCRUMB_SEPARATOR,
          'Breadcrumb',
          "Only accepts Breadcrumb.Item and Breadcrumb.Separator as it's children",
        );
        return cloneElement(element, {
          props: { separator },
          key: index,
        });
      });
    }
    return <div class={prefixCls}>{crumbs}</div>;
  },
};
