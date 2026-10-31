// Wraps each table in a region that scrolls sideways by itself, so a wide table never makes the
// page scroll on a phone and the table keeps its table semantics. The region takes keyboard focus
// (tabindex) so it can be scrolled without a pointer, and is named for screen readers.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type HastPlugin = Extract<NonNullable<SatteriProcessorOptions['hastPlugins']>[number], { name: string }>;

export const tableScroll = {
	name: 'table-scroll',
	element: {
		filter: ['table'],
		visit(node, ctx) {
			ctx.wrapNode(node, {
				type: 'element',
				tagName: 'div',
				properties: { className: ['table-scroll'], tabIndex: 0, role: 'region', ariaLabel: 'Table' },
				children: [],
			});
		},
	},
} satisfies HastPlugin;
