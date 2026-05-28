
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	/** @returns {void} */
	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/** @type {typeof globalThis} */
	const globals =
		typeof window !== 'undefined'
			? window
			: typeof globalThis !== 'undefined'
			? globalThis
			: // @ts-ignore Node typings have this
			  global;

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, important ? 'important' : '');
		}
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	/**
	 * Schedules a callback to run immediately before the component is unmounted.
	 *
	 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
	 * only one that runs inside a server-side component.
	 *
	 * https://svelte.dev/docs/svelte#ondestroy
	 * @param {() => any} fn
	 * @returns {void}
	 */
	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	/**
	 * Creates an event dispatcher that can be used to dispatch [component events](https://svelte.dev/docs#template-syntax-component-directives-on-eventname).
	 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
	 *
	 * Component events created with `createEventDispatcher` create a
	 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
	 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
	 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
	 * property and can contain any type of data.
	 *
	 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
	 * ```ts
	 * const dispatch = createEventDispatcher<{
	 *  loaded: never; // does not take a detail argument
	 *  change: string; // takes a detail argument of type string, which is required
	 *  optional: number | null; // takes an optional detail argument of type number
	 * }>();
	 * ```
	 *
	 * https://svelte.dev/docs/svelte#createeventdispatcher
	 * @template {Record<string, any>} [EventMap=any]
	 * @returns {import('./public.js').EventDispatcher<EventMap>}
	 */
	function createEventDispatcher() {
		const component = get_current_component();
		return (type, detail, { cancelable = false } = {}) => {
			const callbacks = component.$$.callbacks[type];
			if (callbacks) {
				// TODO are there situations where events could be dispatched
				// in a server (non-DOM) environment?
				const event = custom_event(/** @type {string} */ (type), detail, { cancelable });
				callbacks.slice().forEach((fn) => {
					fn.call(component, event);
				});
				return !event.defaultPrevented;
			}
			return true;
		};
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {Promise<void>} */
	function tick() {
		schedule_update();
		return resolved_promise;
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	/**
	 * The current version, as set in package.json.
	 *
	 * https://svelte.dev/docs/svelte-compiler#svelte-version
	 * @type {string}
	 */
	const VERSION = '4.2.20';
	const PUBLIC_VERSION = '4';

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @returns {void}
	 */
	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node });
		append(target, node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor });
		insert(target, node, anchor);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node });
		detach(node);
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
	}

	/**
	 * @param {Element} node
	 * @param {string} property
	 * @param {any} [value]
	 * @returns {void}
	 */
	function prop_dev(node, property, value) {
		node[property] = value;
		dispatch_dev('SvelteDOMSetProperty', { node, property, value });
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data_dev(text, data) {
		data = '' + data;
		if (text.data === data) return;
		dispatch_dev('SvelteDOMSetData', { node: text, data });
		text.data = /** @type {string} */ (data);
	}

	function ensure_array_like_dev(arg) {
		if (
			typeof arg !== 'string' &&
			!(arg && typeof arg === 'object' && 'length' in arg) &&
			!(typeof Symbol === 'function' && arg && Symbol.iterator in arg)
		) {
			throw new Error('{#each} only works with iterable values.');
		}
		return ensure_array_like(arg);
	}

	/**
	 * @returns {void} */
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
			}
		}
	}

	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 *
	 * Can be used to create strongly typed Svelte components.
	 *
	 * #### Example:
	 *
	 * You have component library on npm called `component-library`, from which
	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
	 * you want to provide typings. Therefore you create a `index.d.ts`:
	 * ```ts
	 * import { SvelteComponent } from "svelte";
	 * export class MyComponent extends SvelteComponent<{foo: string}> {}
	 * ```
	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
	 * to provide intellisense and to use the component like this in a Svelte file
	 * with TypeScript:
	 * ```svelte
	 * <script lang="ts">
	 * 	import { MyComponent } from "component-library";
	 * </script>
	 * <MyComponent foo={'bar'} />
	 * ```
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 * @template {Record<string, any>} [Slots=any]
	 * @extends {SvelteComponent<Props, Events>}
	 */
	class SvelteComponentDev extends SvelteComponent {
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Props}
		 */
		$$prop_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Events}
		 */
		$$events_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Slots}
		 */
		$$slot_def;

		/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option");
			}
			super();
		}

		/** @returns {void} */
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn('Component was already destroyed'); // eslint-disable-line no-console
			};
		}

		/** @returns {void} */
		$capture_state() {}

		/** @returns {void} */
		$inject_state() {}
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	/* src\components\Board.svelte generated by Svelte v4.2.20 */
	const file$4 = "src\\components\\Board.svelte";

	function get_each_context$3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[16] = list[i];
		return child_ctx;
	}

	function get_each_context_1$3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[19] = list[i];
		child_ctx[21] = i;
		return child_ctx;
	}

	function get_each_context_2$3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[22] = list[i];
		child_ctx[32] = i;
		const constants_0 = /*cell*/ child_ctx[22];
		child_ctx[23] = constants_0;
		const constants_1 = (/*x*/ child_ctx[21] + /*y*/ child_ctx[32]) % 2 === 0;
		child_ctx[24] = constants_1;
		const constants_2 = /*isLegalMoveTarget*/ child_ctx[6](/*x*/ child_ctx[21], /*y*/ child_ctx[32]);
		child_ctx[25] = constants_2;
		const constants_3 = /*isSelected*/ child_ctx[7](/*x*/ child_ctx[21], /*y*/ child_ctx[32]);
		child_ctx[26] = constants_3;
		const constants_4 = /*isLastMove*/ child_ctx[8](/*x*/ child_ctx[21], /*y*/ child_ctx[32]);
		child_ctx[27] = constants_4;
		const constants_5 = /*isInvalidSquare*/ child_ctx[9](/*x*/ child_ctx[21], /*y*/ child_ctx[32]);
		child_ctx[28] = constants_5;
		const constants_6 = /*flippingPiece*/ child_ctx[1] && /*flippingPiece*/ child_ctx[1].x === /*x*/ child_ctx[21] && /*flippingPiece*/ child_ctx[1].y === /*y*/ child_ctx[32];
		child_ctx[29] = constants_6;
		const constants_7 = /*moveProgress*/ child_ctx[2].length > 0 && /*moveProgress*/ child_ctx[2][/*y*/ child_ctx[32]]?.active;
		child_ctx[30] = constants_7;
		return child_ctx;
	}

	// (74:10) {#if legalTarget}
	function create_if_block_3$3(ctx) {
		let div;
		let div_class_value;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", div_class_value = "move-indicator " + (/*piece*/ ctx[23] ? 'capture' : '') + " svelte-1r8o1r7");
				add_location(div, file$4, 74, 12, 2594);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*board*/ 1 && div_class_value !== (div_class_value = "move-indicator " + (/*piece*/ ctx[23] ? 'capture' : '') + " svelte-1r8o1r7")) {
					attr_dev(div, "class", div_class_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3$3.name,
			type: "if",
			source: "(74:10) {#if legalTarget}",
			ctx
		});

		return block;
	}

	// (78:10) {#if piece}
	function create_if_block_2$3(ctx) {
		let div;
		let span0;
		let t0_value = (/*PIECE_SYMBOLS*/ ctx[4][/*piece*/ ctx[23].type]?.symbol || /*piece*/ ctx[23].type) + "";
		let t0;
		let t1;
		let span1;
		let t2_value = (/*PIECE_SYMBOLS*/ ctx[4][/*piece*/ ctx[23].type]?.chinese || '') + "";
		let t2;
		let div_class_value;

		const block = {
			c: function create() {
				div = element("div");
				span0 = element("span");
				t0 = text(t0_value);
				t1 = space();
				span1 = element("span");
				t2 = text(t2_value);
				attr_dev(span0, "class", "piece-symbol svelte-1r8o1r7");
				add_location(span0, file$4, 82, 14, 2894);
				attr_dev(span1, "class", "piece-chinese svelte-1r8o1r7");
				add_location(span1, file$4, 83, 14, 2992);
				attr_dev(div, "class", div_class_value = "piece " + /*piece*/ ctx[23].side + " " + (/*flipping*/ ctx[29] ? 'flipping' : '') + " svelte-1r8o1r7");

				set_style(div, "--piece-color", /*piece*/ ctx[23].side === 'north'
				? '#c0392b'
				: '#2980b9');

				add_location(div, file$4, 78, 12, 2705);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, span0);
				append_dev(span0, t0);
				append_dev(div, t1);
				append_dev(div, span1);
				append_dev(span1, t2);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*board*/ 1 && t0_value !== (t0_value = (/*PIECE_SYMBOLS*/ ctx[4][/*piece*/ ctx[23].type]?.symbol || /*piece*/ ctx[23].type) + "")) set_data_dev(t0, t0_value);
				if (dirty[0] & /*board*/ 1 && t2_value !== (t2_value = (/*PIECE_SYMBOLS*/ ctx[4][/*piece*/ ctx[23].type]?.chinese || '') + "")) set_data_dev(t2, t2_value);

				if (dirty[0] & /*board, flippingPiece*/ 3 && div_class_value !== (div_class_value = "piece " + /*piece*/ ctx[23].side + " " + (/*flipping*/ ctx[29] ? 'flipping' : '') + " svelte-1r8o1r7")) {
					attr_dev(div, "class", div_class_value);
				}

				if (dirty[0] & /*board*/ 1) {
					set_style(div, "--piece-color", /*piece*/ ctx[23].side === 'north'
					? '#c0392b'
					: '#2980b9');
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$3.name,
			type: "if",
			source: "(78:10) {#if piece}",
			ctx
		});

		return block;
	}

	// (88:10) {#if flipping}
	function create_if_block_1$4(ctx) {
		let div3;
		let div2;
		let div0;
		let span0;
		let t0_value = /*PIECE_SYMBOLS*/ ctx[4][/*flipping*/ ctx[29].from]?.symbol + "";
		let t0;
		let t1;
		let div1;
		let span1;
		let t2_value = /*PIECE_SYMBOLS*/ ctx[4][/*flipping*/ ctx[29].to]?.symbol + "";
		let t2;

		const block = {
			c: function create() {
				div3 = element("div");
				div2 = element("div");
				div0 = element("div");
				span0 = element("span");
				t0 = text(t0_value);
				t1 = space();
				div1 = element("div");
				span1 = element("span");
				t2 = text(t2_value);
				attr_dev(span0, "class", "piece-symbol svelte-1r8o1r7");
				add_location(span0, file$4, 91, 18, 3268);
				attr_dev(div0, "class", "flip-front svelte-1r8o1r7");
				add_location(div0, file$4, 90, 16, 3225);
				attr_dev(span1, "class", "piece-symbol svelte-1r8o1r7");
				add_location(span1, file$4, 94, 18, 3422);
				attr_dev(div1, "class", "flip-back svelte-1r8o1r7");
				add_location(div1, file$4, 93, 16, 3380);
				attr_dev(div2, "class", "flip-inner svelte-1r8o1r7");
				add_location(div2, file$4, 89, 14, 3184);
				attr_dev(div3, "class", "flip-overlay svelte-1r8o1r7");
				add_location(div3, file$4, 88, 12, 3143);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div3, anchor);
				append_dev(div3, div2);
				append_dev(div2, div0);
				append_dev(div0, span0);
				append_dev(span0, t0);
				append_dev(div2, t1);
				append_dev(div2, div1);
				append_dev(div1, span1);
				append_dev(span1, t2);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*flippingPiece*/ 2 && t0_value !== (t0_value = /*PIECE_SYMBOLS*/ ctx[4][/*flipping*/ ctx[29].from]?.symbol + "")) set_data_dev(t0, t0_value);
				if (dirty[0] & /*flippingPiece*/ 2 && t2_value !== (t2_value = /*PIECE_SYMBOLS*/ ctx[4][/*flipping*/ ctx[29].to]?.symbol + "")) set_data_dev(t2, t2_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div3);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$4.name,
			type: "if",
			source: "(88:10) {#if flipping}",
			ctx
		});

		return block;
	}

	// (102:10) {#if x === 7}
	function create_if_block$4(ctx) {
		let span;

		const block = {
			c: function create() {
				span = element("span");
				span.textContent = `${String.fromCharCode(97 + /*y*/ ctx[32])}`;
				attr_dev(span, "class", "coord-label y-label svelte-1r8o1r7");
				add_location(span, file$4, 102, 12, 3668);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(span);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$4.name,
			type: "if",
			source: "(102:10) {#if x === 7}",
			ctx
		});

		return block;
	}

	// (57:6) {#each row as cell, y}
	function create_each_block_2$3(ctx) {
		let div;
		let t0;
		let t1;
		let t2;
		let span;
		let t4;
		let div_class_value;
		let if_block0 = /*legalTarget*/ ctx[25] && create_if_block_3$3(ctx);
		let if_block1 = /*piece*/ ctx[23] && create_if_block_2$3(ctx);
		let if_block2 = /*flipping*/ ctx[29] && create_if_block_1$4(ctx);
		let if_block3 = /*x*/ ctx[21] === 7 && create_if_block$4(ctx);

		function func() {
			return /*func*/ ctx[14](/*x*/ ctx[21], /*y*/ ctx[32]);
		}

		const block = {
			c: function create() {
				div = element("div");
				if (if_block0) if_block0.c();
				t0 = space();
				if (if_block1) if_block1.c();
				t1 = space();
				if (if_block2) if_block2.c();
				t2 = space();
				span = element("span");
				span.textContent = `${/*x*/ ctx[21] + 1}`;
				t4 = space();
				if (if_block3) if_block3.c();
				attr_dev(span, "class", "coord-label x-label svelte-1r8o1r7");
				add_location(span, file$4, 100, 10, 3583);
				attr_dev(div, "class", div_class_value = "square " + (/*isLight*/ ctx[24] ? 'light' : 'dark') + " " + (/*selected*/ ctx[26] ? 'selected' : '') + " " + (/*lastMoveSquare*/ ctx[27] ? 'last-move' : '') + " " + (/*invalid*/ ctx[28] ? 'invalid' : '') + " " + (/*showProgress*/ ctx[30] ? 'progress' : '') + " " + (/*legalTarget*/ ctx[25] ? 'legal-target' : '') + " svelte-1r8o1r7");
				attr_dev(div, "onclick", func);
				set_style(div, "--delay", (/*x*/ ctx[21] * 8 + /*y*/ ctx[32]) * 20 + "ms");
				add_location(div, file$4, 66, 8, 2191);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				if (if_block0) if_block0.m(div, null);
				append_dev(div, t0);
				if (if_block1) if_block1.m(div, null);
				append_dev(div, t1);
				if (if_block2) if_block2.m(div, null);
				append_dev(div, t2);
				append_dev(div, span);
				append_dev(div, t4);
				if (if_block3) if_block3.m(div, null);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (/*legalTarget*/ ctx[25]) if_block0.p(ctx, dirty);

				if (/*piece*/ ctx[23]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_2$3(ctx);
						if_block1.c();
						if_block1.m(div, t1);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (/*flipping*/ ctx[29]) {
					if (if_block2) {
						if_block2.p(ctx, dirty);
					} else {
						if_block2 = create_if_block_1$4(ctx);
						if_block2.c();
						if_block2.m(div, t2);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if (/*x*/ ctx[21] === 7) if_block3.p(ctx, dirty);

				if (dirty[0] & /*moveProgress*/ 4 && div_class_value !== (div_class_value = "square " + (/*isLight*/ ctx[24] ? 'light' : 'dark') + " " + (/*selected*/ ctx[26] ? 'selected' : '') + " " + (/*lastMoveSquare*/ ctx[27] ? 'last-move' : '') + " " + (/*invalid*/ ctx[28] ? 'invalid' : '') + " " + (/*showProgress*/ ctx[30] ? 'progress' : '') + " " + (/*legalTarget*/ ctx[25] ? 'legal-target' : '') + " svelte-1r8o1r7")) {
					attr_dev(div, "class", div_class_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				if (if_block3) if_block3.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2$3.name,
			type: "each",
			source: "(57:6) {#each row as cell, y}",
			ctx
		});

		return block;
	}

	// (56:4) {#each board as row, x}
	function create_each_block_1$3(ctx) {
		let each_1_anchor;
		let each_value_2 = ensure_array_like_dev(/*row*/ ctx[19]);
		let each_blocks = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_2$3(get_each_context_2$3(ctx, each_value_2, i));
		}

		const block = {
			c: function create() {
				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},
			m: function mount(target, anchor) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*isSelected, isLastMove, isInvalidSquare, moveProgress, isLegalMoveTarget, handleSquareClick, PIECE_SYMBOLS, flippingPiece, board*/ 1015) {
					each_value_2 = ensure_array_like_dev(/*row*/ ctx[19]);
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2$3(ctx, each_value_2, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_2$3(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_2.length;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1$3.name,
			type: "each",
			source: "(56:4) {#each board as row, x}",
			ctx
		});

		return block;
	}

	// (109:4) {#each particles as p}
	function create_each_block$3(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "particle svelte-1r8o1r7");
				set_style(div, "--x", /*p*/ ctx[16].x);
				set_style(div, "--y", /*p*/ ctx[16].y);
				set_style(div, "--vx", /*p*/ ctx[16].vx);
				set_style(div, "--vy", /*p*/ ctx[16].vy);
				set_style(div, "--life", /*p*/ ctx[16].life);
				set_style(div, "--color", /*p*/ ctx[16].color);
				set_style(div, "--size", /*p*/ ctx[16].size + "px");
				add_location(div, file$4, 109, 6, 3830);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*particles*/ 8) {
					set_style(div, "--x", /*p*/ ctx[16].x);
				}

				if (dirty[0] & /*particles*/ 8) {
					set_style(div, "--y", /*p*/ ctx[16].y);
				}

				if (dirty[0] & /*particles*/ 8) {
					set_style(div, "--vx", /*p*/ ctx[16].vx);
				}

				if (dirty[0] & /*particles*/ 8) {
					set_style(div, "--vy", /*p*/ ctx[16].vy);
				}

				if (dirty[0] & /*particles*/ 8) {
					set_style(div, "--life", /*p*/ ctx[16].life);
				}

				if (dirty[0] & /*particles*/ 8) {
					set_style(div, "--color", /*p*/ ctx[16].color);
				}

				if (dirty[0] & /*particles*/ 8) {
					set_style(div, "--size", /*p*/ ctx[16].size + "px");
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$3.name,
			type: "each",
			source: "(109:4) {#each particles as p}",
			ctx
		});

		return block;
	}

	function create_fragment$4(ctx) {
		let div1;
		let div0;
		let t;
		let each_value_1 = ensure_array_like_dev(/*board*/ ctx[0]);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1$3(get_each_context_1$3(ctx, each_value_1, i));
		}

		let each_value = ensure_array_like_dev(/*particles*/ ctx[3]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(div0, "class", "board svelte-1r8o1r7");
				set_style(div0, "--cell-size", "64px");
				add_location(div0, file$4, 54, 2, 1628);
				attr_dev(div1, "class", "board-container svelte-1r8o1r7");
				add_location(div1, file$4, 53, 0, 1596);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div0, null);
					}
				}

				append_dev(div0, t);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*board, isSelected, isLastMove, isInvalidSquare, moveProgress, isLegalMoveTarget, handleSquareClick, PIECE_SYMBOLS, flippingPiece*/ 1015) {
					each_value_1 = ensure_array_like_dev(/*board*/ ctx[0]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$3(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
						} else {
							each_blocks_1[i] = create_each_block_1$3(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(div0, t);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}

					each_blocks_1.length = each_value_1.length;
				}

				if (dirty[0] & /*particles*/ 8) {
					each_value = ensure_array_like_dev(/*particles*/ ctx[3]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$3(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$3(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}

				destroy_each(each_blocks_1, detaching);
				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$4.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Board', slots, []);
		const dispatch = createEventDispatcher();
		let { board = [] } = $$props;
		let { selectedPiece = null } = $$props;
		let { legalMoves = [] } = $$props;
		let { lastMove = null } = $$props;
		let { flippingPiece = null } = $$props;
		let { invalidMoveError = null } = $$props;
		let { moveProgress = [] } = $$props;
		let { particles = [] } = $$props;

		const PIECE_SYMBOLS = {
			R: { chinese: '车', symbol: '♖' },
			N: { chinese: '骑', symbol: '♘' },
			B: { chinese: '谋', symbol: '♗' },
			K: { chinese: '帅', symbol: '♔' },
			Q: { chinese: '炮', symbol: '♕' },
			P: { chinese: '兵', symbol: '♙' },
			v: { chinese: '锋', symbol: '♜' },
			a: { chinese: '刺', symbol: '♞' },
			h: { chinese: '弓', symbol: '♝' },
			k: { chinese: '首', symbol: '♚' },
			s: { chinese: '祭', symbol: '♛' },
			w: { chinese: '卒', symbol: '♟' }
		};

		function handleSquareClick(x, y) {
			dispatch('squareClick', { x, y });
		}

		function isLegalMoveTarget(x, y) {
			return legalMoves.some(m => m.to[0] === x && m.to[1] === y);
		}

		function isSelected(x, y) {
			return selectedPiece && selectedPiece.from[0] === x && selectedPiece.from[1] === y;
		}

		function isLastMove(x, y) {
			if (!lastMove) return false;
			return lastMove.from[0] === x && lastMove.from[1] === y || lastMove.to[0] === x && lastMove.to[1] === y;
		}

		function isInvalidSquare(x, y) {
			if (!invalidMoveError) return false;
			return invalidMoveError.from[0] === x && invalidMoveError.from[1] === y || invalidMoveError.to[0] === x && invalidMoveError.to[1] === y;
		}

		const writable_props = [
			'board',
			'selectedPiece',
			'legalMoves',
			'lastMove',
			'flippingPiece',
			'invalidMoveError',
			'moveProgress',
			'particles'
		];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Board> was created with unknown prop '${key}'`);
		});

		const func = (x, y) => handleSquareClick(x, y);

		$$self.$$set = $$props => {
			if ('board' in $$props) $$invalidate(0, board = $$props.board);
			if ('selectedPiece' in $$props) $$invalidate(10, selectedPiece = $$props.selectedPiece);
			if ('legalMoves' in $$props) $$invalidate(11, legalMoves = $$props.legalMoves);
			if ('lastMove' in $$props) $$invalidate(12, lastMove = $$props.lastMove);
			if ('flippingPiece' in $$props) $$invalidate(1, flippingPiece = $$props.flippingPiece);
			if ('invalidMoveError' in $$props) $$invalidate(13, invalidMoveError = $$props.invalidMoveError);
			if ('moveProgress' in $$props) $$invalidate(2, moveProgress = $$props.moveProgress);
			if ('particles' in $$props) $$invalidate(3, particles = $$props.particles);
		};

		$$self.$capture_state = () => ({
			createEventDispatcher,
			dispatch,
			board,
			selectedPiece,
			legalMoves,
			lastMove,
			flippingPiece,
			invalidMoveError,
			moveProgress,
			particles,
			PIECE_SYMBOLS,
			handleSquareClick,
			isLegalMoveTarget,
			isSelected,
			isLastMove,
			isInvalidSquare
		});

		$$self.$inject_state = $$props => {
			if ('board' in $$props) $$invalidate(0, board = $$props.board);
			if ('selectedPiece' in $$props) $$invalidate(10, selectedPiece = $$props.selectedPiece);
			if ('legalMoves' in $$props) $$invalidate(11, legalMoves = $$props.legalMoves);
			if ('lastMove' in $$props) $$invalidate(12, lastMove = $$props.lastMove);
			if ('flippingPiece' in $$props) $$invalidate(1, flippingPiece = $$props.flippingPiece);
			if ('invalidMoveError' in $$props) $$invalidate(13, invalidMoveError = $$props.invalidMoveError);
			if ('moveProgress' in $$props) $$invalidate(2, moveProgress = $$props.moveProgress);
			if ('particles' in $$props) $$invalidate(3, particles = $$props.particles);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			board,
			flippingPiece,
			moveProgress,
			particles,
			PIECE_SYMBOLS,
			handleSquareClick,
			isLegalMoveTarget,
			isSelected,
			isLastMove,
			isInvalidSquare,
			selectedPiece,
			legalMoves,
			lastMove,
			invalidMoveError,
			func
		];
	}

	class Board extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(
				this,
				options,
				instance$4,
				create_fragment$4,
				safe_not_equal,
				{
					board: 0,
					selectedPiece: 10,
					legalMoves: 11,
					lastMove: 12,
					flippingPiece: 1,
					invalidMoveError: 13,
					moveProgress: 2,
					particles: 3
				},
				null,
				[-1, -1]
			);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Board",
				options,
				id: create_fragment$4.name
			});
		}

		get board() {
			throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set board(value) {
			throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get selectedPiece() {
			throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set selectedPiece(value) {
			throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get legalMoves() {
			throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set legalMoves(value) {
			throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get lastMove() {
			throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set lastMove(value) {
			throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get flippingPiece() {
			throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set flippingPiece(value) {
			throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get invalidMoveError() {
			throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set invalidMoveError(value) {
			throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get moveProgress() {
			throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set moveProgress(value) {
			throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get particles() {
			throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set particles(value) {
			throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\GameControls.svelte generated by Svelte v4.2.20 */
	const file$3 = "src\\components\\GameControls.svelte";

	// (27:6) {:else}
	function create_else_block(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("🤖 AI走棋");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block.name,
			type: "else",
			source: "(27:6) {:else}",
			ctx
		});

		return block;
	}

	// (23:6) {#if aiThinking}
	function create_if_block_1$3(ctx) {
		let span3;
		let t0;
		let span0;
		let span1;
		let span2;

		const block = {
			c: function create() {
				span3 = element("span");
				t0 = text("AI思考中");
				span0 = element("span");
				span0.textContent = ".";
				span1 = element("span");
				span1.textContent = ".";
				span2 = element("span");
				span2.textContent = ".";
				attr_dev(span0, "class", "svelte-1wsg024");
				add_location(span0, file$3, 24, 15, 679);
				attr_dev(span1, "class", "svelte-1wsg024");
				add_location(span1, file$3, 24, 29, 693);
				attr_dev(span2, "class", "svelte-1wsg024");
				add_location(span2, file$3, 24, 43, 707);
				attr_dev(span3, "class", "thinking-dots svelte-1wsg024");
				add_location(span3, file$3, 23, 8, 635);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span3, anchor);
				append_dev(span3, t0);
				append_dev(span3, span0);
				append_dev(span3, span1);
				append_dev(span3, span2);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(span3);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$3.name,
			type: "if",
			source: "(23:6) {#if aiThinking}",
			ctx
		});

		return block;
	}

	// (44:2) {#if aiThinking}
	function create_if_block$3(ctx) {
		let div2;
		let div1;
		let div0;
		let t0;
		let span;

		const block = {
			c: function create() {
				div2 = element("div");
				div1 = element("div");
				div0 = element("div");
				t0 = space();
				span = element("span");
				span.textContent = "AI正在使用Alpha-Beta剪枝搜索最优着法...";
				attr_dev(div0, "class", "thinking-progress svelte-1wsg024");
				add_location(div0, file$3, 46, 8, 1159);
				attr_dev(div1, "class", "thinking-bar svelte-1wsg024");
				add_location(div1, file$3, 45, 6, 1124);
				attr_dev(span, "class", "thinking-text svelte-1wsg024");
				add_location(span, file$3, 48, 6, 1216);
				attr_dev(div2, "class", "thinking-animation svelte-1wsg024");
				add_location(div2, file$3, 44, 4, 1085);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div1);
				append_dev(div1, div0);
				append_dev(div2, t0);
				append_dev(div2, span);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$3.name,
			type: "if",
			source: "(44:2) {#if aiThinking}",
			ctx
		});

		return block;
	}

	function create_fragment$3(ctx) {
		let div1;
		let h3;
		let t1;
		let div0;
		let button0;
		let button0_disabled_value;
		let t2;
		let button1;
		let t3;
		let t4;
		let button2;
		let t5;
		let t6_value = (/*showSearchTree*/ ctx[2] ? '隐藏' : '显示') + "";
		let t6;
		let t7;
		let button2_class_value;
		let t8;

		function select_block_type(ctx, dirty) {
			if (/*aiThinking*/ ctx[0]) return create_if_block_1$3;
			return create_else_block;
		}

		let current_block_type = select_block_type(ctx);
		let if_block0 = current_block_type(ctx);
		let if_block1 = /*aiThinking*/ ctx[0] && create_if_block$3(ctx);

		const block = {
			c: function create() {
				div1 = element("div");
				h3 = element("h3");
				h3.textContent = "游戏控制";
				t1 = space();
				div0 = element("div");
				button0 = element("button");
				if_block0.c();
				t2 = space();
				button1 = element("button");
				t3 = text("🔄 重置游戏");
				t4 = space();
				button2 = element("button");
				t5 = text("🌳 ");
				t6 = text(t6_value);
				t7 = text("搜索树");
				t8 = space();
				if (if_block1) if_block1.c();
				attr_dev(h3, "class", "svelte-1wsg024");
				add_location(h3, file$3, 14, 2, 417);
				attr_dev(button0, "class", "control-btn primary svelte-1wsg024");
				attr_dev(button0, "onclick", /*handleAiMove*/ ctx[4]);
				button0.disabled = button0_disabled_value = /*aiThinking*/ ctx[0] || /*gameOver*/ ctx[1] && /*gameOver*/ ctx[1].over;
				add_location(button0, file$3, 17, 4, 468);
				attr_dev(button1, "class", "control-btn svelte-1wsg024");
				attr_dev(button1, "onclick", /*handleReset*/ ctx[3]);
				add_location(button1, file$3, 31, 4, 799);
				attr_dev(button2, "class", button2_class_value = "control-btn " + (/*showSearchTree*/ ctx[2] ? 'active' : '') + " svelte-1wsg024");
				attr_dev(button2, "onclick", /*handleToggleSearchTree*/ ctx[5]);
				add_location(button2, file$3, 35, 4, 883);
				attr_dev(div0, "class", "control-buttons svelte-1wsg024");
				add_location(div0, file$3, 16, 2, 434);
				attr_dev(div1, "class", "controls-section svelte-1wsg024");
				add_location(div1, file$3, 13, 0, 384);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, h3);
				append_dev(div1, t1);
				append_dev(div1, div0);
				append_dev(div0, button0);
				if_block0.m(button0, null);
				append_dev(div0, t2);
				append_dev(div0, button1);
				append_dev(button1, t3);
				append_dev(div0, t4);
				append_dev(div0, button2);
				append_dev(button2, t5);
				append_dev(button2, t6);
				append_dev(button2, t7);
				append_dev(div1, t8);
				if (if_block1) if_block1.m(div1, null);
			},
			p: function update(ctx, [dirty]) {
				if (current_block_type !== (current_block_type = select_block_type(ctx))) {
					if_block0.d(1);
					if_block0 = current_block_type(ctx);

					if (if_block0) {
						if_block0.c();
						if_block0.m(button0, null);
					}
				}

				if (dirty & /*aiThinking, gameOver*/ 3 && button0_disabled_value !== (button0_disabled_value = /*aiThinking*/ ctx[0] || /*gameOver*/ ctx[1] && /*gameOver*/ ctx[1].over)) {
					prop_dev(button0, "disabled", button0_disabled_value);
				}

				if (dirty & /*showSearchTree*/ 4 && t6_value !== (t6_value = (/*showSearchTree*/ ctx[2] ? '隐藏' : '显示') + "")) set_data_dev(t6, t6_value);

				if (dirty & /*showSearchTree*/ 4 && button2_class_value !== (button2_class_value = "control-btn " + (/*showSearchTree*/ ctx[2] ? 'active' : '') + " svelte-1wsg024")) {
					attr_dev(button2, "class", button2_class_value);
				}

				if (/*aiThinking*/ ctx[0]) {
					if (if_block1) ; else {
						if_block1 = create_if_block$3(ctx);
						if_block1.c();
						if_block1.m(div1, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}

				if_block0.d();
				if (if_block1) if_block1.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$3.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('GameControls', slots, []);
		const dispatch = createEventDispatcher();
		let { aiThinking = false } = $$props;
		let { gameOver = null } = $$props;
		let { showSearchTree = false } = $$props;

		function handleReset() {
			dispatch('reset');
		}

		function handleAiMove() {
			dispatch('aiMove');
		}

		function handleToggleSearchTree() {
			dispatch('toggleSearchTree');
		}

		const writable_props = ['aiThinking', 'gameOver', 'showSearchTree'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<GameControls> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('aiThinking' in $$props) $$invalidate(0, aiThinking = $$props.aiThinking);
			if ('gameOver' in $$props) $$invalidate(1, gameOver = $$props.gameOver);
			if ('showSearchTree' in $$props) $$invalidate(2, showSearchTree = $$props.showSearchTree);
		};

		$$self.$capture_state = () => ({
			createEventDispatcher,
			dispatch,
			aiThinking,
			gameOver,
			showSearchTree,
			handleReset,
			handleAiMove,
			handleToggleSearchTree
		});

		$$self.$inject_state = $$props => {
			if ('aiThinking' in $$props) $$invalidate(0, aiThinking = $$props.aiThinking);
			if ('gameOver' in $$props) $$invalidate(1, gameOver = $$props.gameOver);
			if ('showSearchTree' in $$props) $$invalidate(2, showSearchTree = $$props.showSearchTree);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			aiThinking,
			gameOver,
			showSearchTree,
			handleReset,
			handleAiMove,
			handleToggleSearchTree
		];
	}

	class GameControls extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$3, create_fragment$3, safe_not_equal, {
				aiThinking: 0,
				gameOver: 1,
				showSearchTree: 2
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "GameControls",
				options,
				id: create_fragment$3.name
			});
		}

		get aiThinking() {
			throw new Error("<GameControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set aiThinking(value) {
			throw new Error("<GameControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get gameOver() {
			throw new Error("<GameControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set gameOver(value) {
			throw new Error("<GameControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get showSearchTree() {
			throw new Error("<GameControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set showSearchTree(value) {
			throw new Error("<GameControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\SearchTree.svelte generated by Svelte v4.2.20 */
	const file$2 = "src\\components\\SearchTree.svelte";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[3] = list[i];
		child_ctx[5] = i;
		return child_ctx;
	}

	function get_each_context_1$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[6] = list[i];
		child_ctx[8] = i;
		return child_ctx;
	}

	function get_each_context_2$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[6] = list[i];
		child_ctx[8] = i;
		return child_ctx;
	}

	function get_each_context_3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[10] = list[i];
		return child_ctx;
	}

	// (35:2) {#if data && data.length > 0}
	function create_if_block$2(ctx) {
		let div0;
		let t0;
		let div3;
		let div1;
		let span0;
		let t1;
		let t2;
		let div2;
		let span1;
		let t3;
		let each_value = ensure_array_like_dev(/*data*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t0 = space();
				div3 = element("div");
				div1 = element("div");
				span0 = element("span");
				t1 = text(" 最优路径");
				t2 = space();
				div2 = element("div");
				span1 = element("span");
				t3 = text(" 剪枝节点");
				attr_dev(div0, "class", "search-layers svelte-1vrwfp9");
				add_location(div0, file$2, 35, 4, 875);
				attr_dev(span0, "class", "legend-dot on-path svelte-1vrwfp9");
				add_location(span0, file$2, 85, 8, 2770);
				attr_dev(div1, "class", "legend-item svelte-1vrwfp9");
				add_location(div1, file$2, 84, 6, 2736);
				attr_dev(span1, "class", "legend-dot pruned svelte-1vrwfp9");
				add_location(span1, file$2, 88, 8, 2869);
				attr_dev(div2, "class", "legend-item svelte-1vrwfp9");
				add_location(div2, file$2, 87, 6, 2835);
				attr_dev(div3, "class", "search-legend svelte-1vrwfp9");
				add_location(div3, file$2, 83, 4, 2702);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div0, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				insert_dev(target, t0, anchor);
				insert_dev(target, div3, anchor);
				append_dev(div3, div1);
				append_dev(div1, span0);
				append_dev(div1, t1);
				append_dev(div3, t2);
				append_dev(div3, div2);
				append_dev(div2, span1);
				append_dev(div2, t3);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*data, getScoreColor, moveToCoord*/ 1) {
					each_value = ensure_array_like_dev(/*data*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div0);
					detach_dev(t0);
					detach_dev(div3);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$2.name,
			type: "if",
			source: "(35:2) {#if data && data.length > 0}",
			ctx
		});

		return block;
	}

	// (41:12) {#if layer.bestMove}
	function create_if_block_4$2(ctx) {
		let span;
		let t0;
		let t1_value = moveToCoord(/*layer*/ ctx[3].bestMove) + "";
		let t1;

		const block = {
			c: function create() {
				span = element("span");
				t0 = text("最佳: ");
				t1 = text(t1_value);
				attr_dev(span, "class", "layer-best svelte-1vrwfp9");
				add_location(span, file$2, 41, 14, 1151);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
				append_dev(span, t0);
				append_dev(span, t1);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*data*/ 1 && t1_value !== (t1_value = moveToCoord(/*layer*/ ctx[3].bestMove) + "")) set_data_dev(t1, t1_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(span);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4$2.name,
			type: "if",
			source: "(41:12) {#if layer.bestMove}",
			ctx
		});

		return block;
	}

	// (59:16) {#if move.special}
	function create_if_block_3$2(ctx) {
		let div;
		let t_value = /*move*/ ctx[6].special + "";
		let t;

		const block = {
			c: function create() {
				div = element("div");
				t = text(t_value);
				attr_dev(div, "class", "move-special svelte-1vrwfp9");
				add_location(div, file$2, 59, 18, 1932);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, t);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*data*/ 1 && t_value !== (t_value = /*move*/ ctx[6].special + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3$2.name,
			type: "if",
			source: "(59:16) {#if move.special}",
			ctx
		});

		return block;
	}

	// (62:16) {#if move.path && move.path.length > 0}
	function create_if_block_2$2(ctx) {
		let div;
		let each_value_3 = ensure_array_like_dev(/*move*/ ctx[6].path.slice(0, 3));
		let each_blocks = [];

		for (let i = 0; i < each_value_3.length; i += 1) {
			each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
		}

		const block = {
			c: function create() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(div, "class", "move-variations svelte-1vrwfp9");
				add_location(div, file$2, 62, 18, 2075);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*getScoreColor, data*/ 1) {
					each_value_3 = ensure_array_like_dev(/*move*/ ctx[6].path.slice(0, 3));
					let i;

					for (i = 0; i < each_value_3.length; i += 1) {
						const child_ctx = get_each_context_3(ctx, each_value_3, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_3(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_3.length;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$2.name,
			type: "if",
			source: "(62:16) {#if move.path && move.path.length > 0}",
			ctx
		});

		return block;
	}

	// (64:20) {#each move.path.slice(0, 3) as pv}
	function create_each_block_3(ctx) {
		let span;

		const block = {
			c: function create() {
				span = element("span");
				attr_dev(span, "class", "variation-dot svelte-1vrwfp9");
				set_style(span, "background", getScoreColor(/*pv*/ ctx[10].score));
				add_location(span, file$2, 64, 22, 2183);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*data*/ 1) {
					set_style(span, "background", getScoreColor(/*pv*/ ctx[10].score));
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(span);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_3.name,
			type: "each",
			source: "(64:20) {#each move.path.slice(0, 3) as pv}",
			ctx
		});

		return block;
	}

	// (49:12) {#each layer.moves as move, j}
	function create_each_block_2$2(ctx) {
		let div2;
		let div0;

		let t0_value = moveToCoord({
			from: /*move*/ ctx[6].from,
			to: /*move*/ ctx[6].to
		}) + "";

		let t0;
		let t1;
		let div1;
		let t2_value = (/*move*/ ctx[6].score?.toFixed(0) || '?') + "";
		let t2;
		let t3;
		let t4;
		let t5;
		let div2_class_value;
		let if_block0 = /*move*/ ctx[6].special && create_if_block_3$2(ctx);
		let if_block1 = /*move*/ ctx[6].path && /*move*/ ctx[6].path.length > 0 && create_if_block_2$2(ctx);

		const block = {
			c: function create() {
				div2 = element("div");
				div0 = element("div");
				t0 = text(t0_value);
				t1 = space();
				div1 = element("div");
				t2 = text(t2_value);
				t3 = space();
				if (if_block0) if_block0.c();
				t4 = space();
				if (if_block1) if_block1.c();
				t5 = space();
				attr_dev(div0, "class", "move-coord svelte-1vrwfp9");
				add_location(div0, file$2, 54, 16, 1646);
				attr_dev(div1, "class", "move-score svelte-1vrwfp9");
				set_style(div1, "color", getScoreColor(/*move*/ ctx[6].score));
				add_location(div1, file$2, 55, 16, 1738);

				attr_dev(div2, "class", div2_class_value = "move-node " + (/*data*/ ctx[0][/*i*/ ctx[5] + 1]?.bestMove && /*move*/ ctx[6].to[0] === /*data*/ ctx[0][/*i*/ ctx[5] + 1].bestMove.from[0] && /*move*/ ctx[6].to[1] === /*data*/ ctx[0][/*i*/ ctx[5] + 1].bestMove.from[1]
				? 'on-path'
				: '') + " svelte-1vrwfp9");

				set_style(div2, "--node-delay", /*j*/ ctx[8] * 50 + "ms");
				add_location(div2, file$2, 49, 14, 1378);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div0);
				append_dev(div0, t0);
				append_dev(div2, t1);
				append_dev(div2, div1);
				append_dev(div1, t2);
				append_dev(div2, t3);
				if (if_block0) if_block0.m(div2, null);
				append_dev(div2, t4);
				if (if_block1) if_block1.m(div2, null);
				append_dev(div2, t5);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*data*/ 1 && t0_value !== (t0_value = moveToCoord({
					from: /*move*/ ctx[6].from,
					to: /*move*/ ctx[6].to
				}) + "")) set_data_dev(t0, t0_value);

				if (dirty & /*data*/ 1 && t2_value !== (t2_value = (/*move*/ ctx[6].score?.toFixed(0) || '?') + "")) set_data_dev(t2, t2_value);

				if (dirty & /*data*/ 1) {
					set_style(div1, "color", getScoreColor(/*move*/ ctx[6].score));
				}

				if (/*move*/ ctx[6].special) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_3$2(ctx);
						if_block0.c();
						if_block0.m(div2, t4);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (/*move*/ ctx[6].path && /*move*/ ctx[6].path.length > 0) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_2$2(ctx);
						if_block1.c();
						if_block1.m(div2, t5);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (dirty & /*data*/ 1 && div2_class_value !== (div2_class_value = "move-node " + (/*data*/ ctx[0][/*i*/ ctx[5] + 1]?.bestMove && /*move*/ ctx[6].to[0] === /*data*/ ctx[0][/*i*/ ctx[5] + 1].bestMove.from[0] && /*move*/ ctx[6].to[1] === /*data*/ ctx[0][/*i*/ ctx[5] + 1].bestMove.from[1]
				? 'on-path'
				: '') + " svelte-1vrwfp9")) {
					attr_dev(div2, "class", div2_class_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2$2.name,
			type: "each",
			source: "(49:12) {#each layer.moves as move, j}",
			ctx
		});

		return block;
	}

	// (73:10) {#if i < data.length - 1}
	function create_if_block_1$2(ctx) {
		let div;
		let each_value_1 = ensure_array_like_dev(/*layer*/ ctx[3].moves);
		let each_blocks = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
		}

		const block = {
			c: function create() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(div, "class", "tree-branches");
				add_location(div, file$2, 73, 12, 2447);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*data*/ 1) {
					each_value_1 = ensure_array_like_dev(/*layer*/ ctx[3].moves);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_1$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_1.length;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$2.name,
			type: "if",
			source: "(73:10) {#if i < data.length - 1}",
			ctx
		});

		return block;
	}

	// (75:14) {#each layer.moves as move, j}
	function create_each_block_1$2(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "branch-line");
				set_style(div, "--branch-x", /*j*/ ctx[8] * 60 + "px");
				add_location(div, file$2, 75, 16, 2536);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1$2.name,
			type: "each",
			source: "(75:14) {#each layer.moves as move, j}",
			ctx
		});

		return block;
	}

	// (37:6) {#each data as layer, i}
	function create_each_block$2(ctx) {
		let div2;
		let div0;
		let span;
		let t0;
		let t1_value = /*layer*/ ctx[3].depth + "";
		let t1;
		let t2;
		let t3;
		let div1;
		let t4;
		let t5;
		let if_block0 = /*layer*/ ctx[3].bestMove && create_if_block_4$2(ctx);
		let each_value_2 = ensure_array_like_dev(/*layer*/ ctx[3].moves);
		let each_blocks = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_2$2(get_each_context_2$2(ctx, each_value_2, i));
		}

		let if_block1 = /*i*/ ctx[5] < /*data*/ ctx[0].length - 1 && create_if_block_1$2(ctx);

		const block = {
			c: function create() {
				div2 = element("div");
				div0 = element("div");
				span = element("span");
				t0 = text("深度 ");
				t1 = text(t1_value);
				t2 = space();
				if (if_block0) if_block0.c();
				t3 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t4 = space();
				if (if_block1) if_block1.c();
				t5 = space();
				attr_dev(span, "class", "layer-depth svelte-1vrwfp9");
				add_location(span, file$2, 39, 12, 1054);
				attr_dev(div0, "class", "layer-header svelte-1vrwfp9");
				add_location(div0, file$2, 38, 10, 1015);
				attr_dev(div1, "class", "layer-moves svelte-1vrwfp9");
				add_location(div1, file$2, 47, 10, 1295);
				attr_dev(div2, "class", "search-layer svelte-1vrwfp9");
				set_style(div2, "--layer-delay", /*i*/ ctx[5] * 100 + "ms");
				add_location(div2, file$2, 37, 8, 942);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div0);
				append_dev(div0, span);
				append_dev(span, t0);
				append_dev(span, t1);
				append_dev(div0, t2);
				if (if_block0) if_block0.m(div0, null);
				append_dev(div2, t3);
				append_dev(div2, div1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				append_dev(div2, t4);
				if (if_block1) if_block1.m(div2, null);
				append_dev(div2, t5);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*data*/ 1 && t1_value !== (t1_value = /*layer*/ ctx[3].depth + "")) set_data_dev(t1, t1_value);

				if (/*layer*/ ctx[3].bestMove) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_4$2(ctx);
						if_block0.c();
						if_block0.m(div0, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (dirty & /*data, getScoreColor, moveToCoord*/ 1) {
					each_value_2 = ensure_array_like_dev(/*layer*/ ctx[3].moves);
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2$2(ctx, each_value_2, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_2$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div1, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_2.length;
				}

				if (/*i*/ ctx[5] < /*data*/ ctx[0].length - 1) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_1$2(ctx);
						if_block1.c();
						if_block1.m(div2, t5);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				if (if_block0) if_block0.d();
				destroy_each(each_blocks, detaching);
				if (if_block1) if_block1.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$2.name,
			type: "each",
			source: "(37:6) {#each data as layer, i}",
			ctx
		});

		return block;
	}

	function create_fragment$2(ctx) {
		let div1;
		let h3;
		let t1;
		let div0;
		let span0;
		let t2;
		let t3_value = (/*data*/ ctx[0]?.length || 0) + "";
		let t3;
		let t4;
		let t5;
		let span1;
		let t6;
		let t7;
		let t8;
		let if_block = /*data*/ ctx[0] && /*data*/ ctx[0].length > 0 && create_if_block$2(ctx);

		const block = {
			c: function create() {
				div1 = element("div");
				h3 = element("h3");
				h3.textContent = "🌳 博弈树搜索路径";
				t1 = space();
				div0 = element("div");
				span0 = element("span");
				t2 = text("深度: ");
				t3 = text(t3_value);
				t4 = text(" 层");
				t5 = space();
				span1 = element("span");
				t6 = text("节点: ");
				t7 = text(/*totalNodes*/ ctx[1]);
				t8 = space();
				if (if_block) if_block.c();
				attr_dev(h3, "class", "svelte-1vrwfp9");
				add_location(h3, file$2, 27, 2, 700);
				add_location(span0, file$2, 30, 4, 756);
				add_location(span1, file$2, 31, 4, 799);
				attr_dev(div0, "class", "search-summary svelte-1vrwfp9");
				add_location(div0, file$2, 29, 2, 723);
				attr_dev(div1, "class", "search-tree-section svelte-1vrwfp9");
				add_location(div1, file$2, 26, 0, 664);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, h3);
				append_dev(div1, t1);
				append_dev(div1, div0);
				append_dev(div0, span0);
				append_dev(span0, t2);
				append_dev(span0, t3);
				append_dev(span0, t4);
				append_dev(div0, t5);
				append_dev(div0, span1);
				append_dev(span1, t6);
				append_dev(span1, t7);
				append_dev(div1, t8);
				if (if_block) if_block.m(div1, null);
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*data*/ 1 && t3_value !== (t3_value = (/*data*/ ctx[0]?.length || 0) + "")) set_data_dev(t3, t3_value);
				if (dirty & /*totalNodes*/ 2) set_data_dev(t7, /*totalNodes*/ ctx[1]);

				if (/*data*/ ctx[0] && /*data*/ ctx[0].length > 0) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$2(ctx);
						if_block.c();
						if_block.m(div1, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}

				if (if_block) if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$2.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function moveToCoord(move) {
		if (!move) return '?';
		const files = 'abcdefgh';
		return `${files[move.from[1]]}${move.from[0] + 1}→${files[move.to[1]]}${move.to[0] + 1}`;
	}

	function getScoreColor(score) {
		if (!score) return '#888';
		if (score > 50) return '#2ecc71';
		if (score > 0) return '#27ae60';
		if (score > -50) return '#e67e22';
		return '#e74c3c';
	}

	function instance$2($$self, $$props, $$invalidate) {
		let depthLayers;
		let totalNodes;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('SearchTree', slots, []);
		let { data = null } = $$props;
		const writable_props = ['data'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SearchTree> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('data' in $$props) $$invalidate(0, data = $$props.data);
		};

		$$self.$capture_state = () => ({
			data,
			moveToCoord,
			getScoreColor,
			totalNodes,
			depthLayers
		});

		$$self.$inject_state = $$props => {
			if ('data' in $$props) $$invalidate(0, data = $$props.data);
			if ('totalNodes' in $$props) $$invalidate(1, totalNodes = $$props.totalNodes);
			if ('depthLayers' in $$props) depthLayers = $$props.depthLayers;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*data*/ 1) {
				depthLayers = data
				? data.map(layer => ({
						depth: layer.depth,
						moves: layer.moves,
						bestMove: layer.bestMove
					}))
				: [];
			}

			if ($$self.$$.dirty & /*data*/ 1) {
				$$invalidate(1, totalNodes = data
				? data.reduce((sum, l) => sum + (l.moves?.length || 0), 0)
				: 0);
			}
		};

		return [data, totalNodes];
	}

	class SearchTree extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, { data: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "SearchTree",
				options,
				id: create_fragment$2.name
			});
		}

		get data() {
			throw new Error("<SearchTree>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set data(value) {
			throw new Error("<SearchTree>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\EdgeCases.svelte generated by Svelte v4.2.20 */

	const { Object: Object_1 } = globals;
	const file$1 = "src\\components\\EdgeCases.svelte";

	function get_each_context_1$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[11] = list[i];
		return child_ctx;
	}

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i][0];
		child_ctx[8] = list[i][1];
		return child_ctx;
	}

	function get_each_context_2$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[14] = list[i];
		return child_ctx;
	}

	// (63:4) {#each EDGE_CASES as ec}
	function create_each_block_2$1(ctx) {
		let button;
		let span0;
		let t1;
		let span1;
		let t3;

		function func() {
			return /*func*/ ctx[5](/*ec*/ ctx[14]);
		}

		const block = {
			c: function create() {
				button = element("button");
				span0 = element("span");
				span0.textContent = `${/*ec*/ ctx[14].icon}`;
				t1 = space();
				span1 = element("span");
				span1.textContent = `${/*ec*/ ctx[14].name}`;
				t3 = space();
				attr_dev(span0, "class", "edge-icon svelte-nh9mc7");
				add_location(span0, file$1, 69, 8, 1486);
				attr_dev(span1, "class", "edge-name svelte-nh9mc7");
				add_location(span1, file$1, 70, 8, 1535);
				attr_dev(button, "class", "edge-case-btn svelte-nh9mc7");
				set_style(button, "--accent", /*ec*/ ctx[14].color);
				attr_dev(button, "onclick", func);
				attr_dev(button, "title", /*ec*/ ctx[14].description);
				add_location(button, file$1, 63, 6, 1317);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);
				append_dev(button, span0);
				append_dev(button, t1);
				append_dev(button, span1);
				append_dev(button, t3);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2$1.name,
			type: "each",
			source: "(63:4) {#each EDGE_CASES as ec}",
			ctx
		});

		return block;
	}

	// (76:2) {#if show && result}
	function create_if_block$1(ctx) {
		let div;
		let button;
		let t0;
		let t1;

		function select_block_type(ctx, dirty) {
			if (/*result*/ ctx[0].caseType === 'threefold') return create_if_block_1$1;
			if (/*result*/ ctx[0].caseType === 'perpetual-check') return create_if_block_3$1;
			if (/*result*/ ctx[0].caseType === 'zobrist-collision') return create_if_block_5$1;
			if (/*result*/ ctx[0].caseType === 'depth-exhaustion') return create_if_block_8;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type && current_block_type(ctx);

		const block = {
			c: function create() {
				div = element("div");
				button = element("button");
				t0 = text("✕");
				t1 = space();
				if (if_block) if_block.c();
				attr_dev(button, "class", "close-btn svelte-nh9mc7");
				attr_dev(button, "onclick", /*handleClose*/ ctx[4]);
				add_location(button, file$1, 77, 6, 1722);
				attr_dev(div, "class", "edge-result-panel svelte-nh9mc7");
				set_style(div, "--accent", getResultColor(/*result*/ ctx[0]));
				add_location(div, file$1, 76, 4, 1641);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, button);
				append_dev(button, t0);
				append_dev(div, t1);
				if (if_block) if_block.m(div, null);
			},
			p: function update(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if (if_block) if_block.d(1);
					if_block = current_block_type && current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div, null);
					}
				}

				if (dirty & /*result*/ 1) {
					set_style(div, "--accent", getResultColor(/*result*/ ctx[0]));
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (if_block) {
					if_block.d();
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$1.name,
			type: "if",
			source: "(76:2) {#if show && result}",
			ctx
		});

		return block;
	}

	// (157:55) 
	function create_if_block_8(ctx) {
		let div4;
		let h4;
		let t1;
		let div2;
		let div0;
		let h50;
		let t3;
		let t4;
		let div1;
		let h51;
		let t6;
		let t7;
		let t8;
		let div3;
		let t9;
		let t10_value = /*result*/ ctx[0].blindSacrificeNote + "";
		let t10;
		let t11;
		let if_block0 = /*result*/ ctx[0].shallowMove && create_if_block_11(ctx);
		let if_block1 = /*result*/ ctx[0].deepMove && create_if_block_10(ctx);
		let if_block2 = /*result*/ ctx[0].disagreement && create_if_block_9(ctx);

		const block = {
			c: function create() {
				div4 = element("div");
				h4 = element("h4");
				h4.textContent = "🌑 搜索深度耗尽分析";
				t1 = space();
				div2 = element("div");
				div0 = element("div");
				h50 = element("h5");
				h50.textContent = "浅层搜索 (深度1)";
				t3 = space();
				if (if_block0) if_block0.c();
				t4 = space();
				div1 = element("div");
				h51 = element("h5");
				h51.textContent = "深层搜索 (深度4)";
				t6 = space();
				if (if_block1) if_block1.c();
				t7 = space();
				if (if_block2) if_block2.c();
				t8 = space();
				div3 = element("div");
				t9 = text("💡 ");
				t10 = text(t10_value);
				t11 = text("。\n            当搜索深度不足以看清长远后果时，AI可能为获得短期物质优势而放弃战略位置。");
				attr_dev(h4, "class", "svelte-nh9mc7");
				add_location(h4, file$1, 158, 10, 4674);
				attr_dev(h50, "class", "svelte-nh9mc7");
				add_location(h50, file$1, 162, 14, 4787);
				attr_dev(div0, "class", "depth-col svelte-nh9mc7");
				add_location(div0, file$1, 161, 12, 4749);
				attr_dev(h51, "class", "svelte-nh9mc7");
				add_location(h51, file$1, 173, 14, 5258);
				attr_dev(div1, "class", "depth-col svelte-nh9mc7");
				add_location(div1, file$1, 172, 12, 5220);
				attr_dev(div2, "class", "depth-comparison svelte-nh9mc7");
				add_location(div2, file$1, 160, 10, 4706);
				attr_dev(div3, "class", "note svelte-nh9mc7");
				add_location(div3, file$1, 191, 10, 5851);
				attr_dev(div4, "class", "result-content svelte-nh9mc7");
				add_location(div4, file$1, 157, 8, 4635);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div4, anchor);
				append_dev(div4, h4);
				append_dev(div4, t1);
				append_dev(div4, div2);
				append_dev(div2, div0);
				append_dev(div0, h50);
				append_dev(div0, t3);
				if (if_block0) if_block0.m(div0, null);
				append_dev(div2, t4);
				append_dev(div2, div1);
				append_dev(div1, h51);
				append_dev(div1, t6);
				if (if_block1) if_block1.m(div1, null);
				append_dev(div4, t7);
				if (if_block2) if_block2.m(div4, null);
				append_dev(div4, t8);
				append_dev(div4, div3);
				append_dev(div3, t9);
				append_dev(div3, t10);
				append_dev(div3, t11);
			},
			p: function update(ctx, dirty) {
				if (/*result*/ ctx[0].shallowMove) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_11(ctx);
						if_block0.c();
						if_block0.m(div0, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (/*result*/ ctx[0].deepMove) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_10(ctx);
						if_block1.c();
						if_block1.m(div1, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (/*result*/ ctx[0].disagreement) {
					if (if_block2) ; else {
						if_block2 = create_if_block_9(ctx);
						if_block2.c();
						if_block2.m(div4, t8);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if (dirty & /*result*/ 1 && t10_value !== (t10_value = /*result*/ ctx[0].blindSacrificeNote + "")) set_data_dev(t10, t10_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div4);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_8.name,
			type: "if",
			source: "(157:55) ",
			ctx
		});

		return block;
	}

	// (127:56) 
	function create_if_block_5$1(ctx) {
		let div3;
		let h4;
		let t1;
		let div1;
		let div0;
		let span0;
		let t3;
		let span1;
		let t4_value = /*result*/ ctx[0].hash + "";
		let t4;
		let t5;
		let t6;
		let div2;
		let t7;
		let t8_value = /*result*/ ctx[0].collisionRiskNote + "";
		let t8;
		let t9;
		let if_block = /*result*/ ctx[0].storedScore !== undefined && create_if_block_6(ctx);

		const block = {
			c: function create() {
				div3 = element("div");
				h4 = element("h4");
				h4.textContent = "💥 Zobrist哈希碰撞分析";
				t1 = space();
				div1 = element("div");
				div0 = element("div");
				span0 = element("span");
				span0.textContent = "当前哈希:";
				t3 = space();
				span1 = element("span");
				t4 = text(t4_value);
				t5 = space();
				if (if_block) if_block.c();
				t6 = space();
				div2 = element("div");
				t7 = text("💡 ");
				t8 = text(t8_value);
				t9 = text("。\n            当两个不同局面产生相同哈希时，置换表会返回错误的评估分数。");
				attr_dev(h4, "class", "svelte-nh9mc7");
				add_location(h4, file$1, 128, 10, 3557);
				attr_dev(span0, "class", "hash-label svelte-nh9mc7");
				add_location(span0, file$1, 131, 14, 3669);
				attr_dev(span1, "class", "hash-value svelte-nh9mc7");
				add_location(span1, file$1, 132, 14, 3721);
				attr_dev(div0, "class", "hash-row svelte-nh9mc7");
				add_location(div0, file$1, 130, 12, 3632);
				attr_dev(div1, "class", "hash-display svelte-nh9mc7");
				add_location(div1, file$1, 129, 10, 3593);
				attr_dev(div2, "class", "note svelte-nh9mc7");
				add_location(div2, file$1, 151, 10, 4435);
				attr_dev(div3, "class", "result-content svelte-nh9mc7");
				add_location(div3, file$1, 127, 8, 3518);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div3, anchor);
				append_dev(div3, h4);
				append_dev(div3, t1);
				append_dev(div3, div1);
				append_dev(div1, div0);
				append_dev(div0, span0);
				append_dev(div0, t3);
				append_dev(div0, span1);
				append_dev(span1, t4);
				append_dev(div1, t5);
				if (if_block) if_block.m(div1, null);
				append_dev(div3, t6);
				append_dev(div3, div2);
				append_dev(div2, t7);
				append_dev(div2, t8);
				append_dev(div2, t9);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*result*/ 1 && t4_value !== (t4_value = /*result*/ ctx[0].hash + "")) set_data_dev(t4, t4_value);

				if (/*result*/ ctx[0].storedScore !== undefined) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_6(ctx);
						if_block.c();
						if_block.m(div1, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty & /*result*/ 1 && t8_value !== (t8_value = /*result*/ ctx[0].collisionRiskNote + "")) set_data_dev(t8, t8_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div3);
				}

				if (if_block) if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_5$1.name,
			type: "if",
			source: "(127:56) ",
			ctx
		});

		return block;
	}

	// (104:54) 
	function create_if_block_3$1(ctx) {
		let div2;
		let h4;
		let t1;
		let div0;

		let t2_value = (/*result*/ ctx[0].perpetualDetected
		? '⚠️ 长将循环已检测!'
		: '未形成长将循环') + "";

		let t2;
		let div0_class_value;
		let t3;
		let t4;
		let div1;
		let t5;
		let t6_value = /*result*/ ctx[0].ruleNote + "";
		let t6;
		let t7;
		let if_block = /*result*/ ctx[0].checkSequence && create_if_block_4$1(ctx);

		const block = {
			c: function create() {
				div2 = element("div");
				h4 = element("h4");
				h4.textContent = "⚔️ 长将规则分析";
				t1 = space();
				div0 = element("div");
				t2 = text(t2_value);
				t3 = space();
				if (if_block) if_block.c();
				t4 = space();
				div1 = element("div");
				t5 = text("💡 ");
				t6 = text(t6_value);
				t7 = text("\n            由于双方棋子的移动模式不对称，传统的长将判定可能产生误判。");
				attr_dev(h4, "class", "svelte-nh9mc7");
				add_location(h4, file$1, 105, 10, 2768);

				attr_dev(div0, "class", div0_class_value = "result-status " + (/*result*/ ctx[0].perpetualDetected
				? 'detected'
				: 'not-detected') + " svelte-nh9mc7");

				add_location(div0, file$1, 106, 10, 2797);
				attr_dev(div1, "class", "note svelte-nh9mc7");
				add_location(div1, file$1, 121, 10, 3327);
				attr_dev(div2, "class", "result-content svelte-nh9mc7");
				add_location(div2, file$1, 104, 8, 2729);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, h4);
				append_dev(div2, t1);
				append_dev(div2, div0);
				append_dev(div0, t2);
				append_dev(div2, t3);
				if (if_block) if_block.m(div2, null);
				append_dev(div2, t4);
				append_dev(div2, div1);
				append_dev(div1, t5);
				append_dev(div1, t6);
				append_dev(div1, t7);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*result*/ 1 && t2_value !== (t2_value = (/*result*/ ctx[0].perpetualDetected
				? '⚠️ 长将循环已检测!'
				: '未形成长将循环') + "")) set_data_dev(t2, t2_value);

				if (dirty & /*result*/ 1 && div0_class_value !== (div0_class_value = "result-status " + (/*result*/ ctx[0].perpetualDetected
				? 'detected'
				: 'not-detected') + " svelte-nh9mc7")) {
					attr_dev(div0, "class", div0_class_value);
				}

				if (/*result*/ ctx[0].checkSequence) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_4$1(ctx);
						if_block.c();
						if_block.m(div2, t4);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty & /*result*/ 1 && t6_value !== (t6_value = /*result*/ ctx[0].ruleNote + "")) set_data_dev(t6, t6_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				if (if_block) if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3$1.name,
			type: "if",
			source: "(104:54) ",
			ctx
		});

		return block;
	}

	// (80:6) {#if result.caseType === 'threefold'}
	function create_if_block_1$1(ctx) {
		let div2;
		let h4;
		let t1;
		let div0;

		let t2_value = (/*result*/ ctx[0].threefoldDetected
		? '⚠️ 检测到重复局面死循环!'
		: '未检测到重复') + "";

		let t2;
		let div0_class_value;
		let t3;
		let t4;
		let div1;
		let if_block = /*result*/ ctx[0].positionCounts && create_if_block_2$1(ctx);

		const block = {
			c: function create() {
				div2 = element("div");
				h4 = element("h4");
				h4.textContent = "🔄 三维重复局面分析";
				t1 = space();
				div0 = element("div");
				t2 = text(t2_value);
				t3 = space();
				if (if_block) if_block.c();
				t4 = space();
				div1 = element("div");
				div1.textContent = "💡 当同一局面出现3次时，规则引擎应判为和棋。\n            但在非对称棋类中，由于棋子能力差异，重复局面可能带来不同的实际价值。";
				attr_dev(h4, "class", "svelte-nh9mc7");
				add_location(h4, file$1, 81, 10, 1873);

				attr_dev(div0, "class", div0_class_value = "result-status " + (/*result*/ ctx[0].threefoldDetected
				? 'detected'
				: 'not-detected') + " svelte-nh9mc7");

				add_location(div0, file$1, 82, 10, 1904);
				attr_dev(div1, "class", "note svelte-nh9mc7");
				add_location(div1, file$1, 98, 10, 2531);
				attr_dev(div2, "class", "result-content svelte-nh9mc7");
				add_location(div2, file$1, 80, 8, 1834);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, h4);
				append_dev(div2, t1);
				append_dev(div2, div0);
				append_dev(div0, t2);
				append_dev(div2, t3);
				if (if_block) if_block.m(div2, null);
				append_dev(div2, t4);
				append_dev(div2, div1);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*result*/ 1 && t2_value !== (t2_value = (/*result*/ ctx[0].threefoldDetected
				? '⚠️ 检测到重复局面死循环!'
				: '未检测到重复') + "")) set_data_dev(t2, t2_value);

				if (dirty & /*result*/ 1 && div0_class_value !== (div0_class_value = "result-status " + (/*result*/ ctx[0].threefoldDetected
				? 'detected'
				: 'not-detected') + " svelte-nh9mc7")) {
					attr_dev(div0, "class", div0_class_value);
				}

				if (/*result*/ ctx[0].positionCounts) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_2$1(ctx);
						if_block.c();
						if_block.m(div2, t4);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				if (if_block) if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$1.name,
			type: "if",
			source: "(80:6) {#if result.caseType === 'threefold'}",
			ctx
		});

		return block;
	}

	// (164:14) {#if result.shallowMove}
	function create_if_block_11(ctx) {
		let div2;
		let div0;
		let t0;
		let t1_value = /*result*/ ctx[0].shallowMove.from + "";
		let t1;
		let t2;
		let t3_value = /*result*/ ctx[0].shallowMove.to + "";
		let t3;
		let t4;
		let t5;
		let div1;
		let t6;
		let t7_value = /*result*/ ctx[0].shallowScore?.toFixed(1) + "";
		let t7;
		let div1_class_value;

		const block = {
			c: function create() {
				div2 = element("div");
				div0 = element("div");
				t0 = text("位置: [");
				t1 = text(t1_value);
				t2 = text(" → ");
				t3 = text(t3_value);
				t4 = text("]");
				t5 = space();
				div1 = element("div");
				t6 = text("分数: ");
				t7 = text(t7_value);
				add_location(div0, file$1, 165, 18, 4904);

				attr_dev(div1, "class", div1_class_value = "score " + (/*result*/ ctx[0].shallowScore > 0
				? 'positive'
				: 'negative') + " svelte-nh9mc7");

				add_location(div1, file$1, 166, 18, 4991);
				attr_dev(div2, "class", "move-info svelte-nh9mc7");
				add_location(div2, file$1, 164, 16, 4862);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div0);
				append_dev(div0, t0);
				append_dev(div0, t1);
				append_dev(div0, t2);
				append_dev(div0, t3);
				append_dev(div0, t4);
				append_dev(div2, t5);
				append_dev(div2, div1);
				append_dev(div1, t6);
				append_dev(div1, t7);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*result*/ 1 && t1_value !== (t1_value = /*result*/ ctx[0].shallowMove.from + "")) set_data_dev(t1, t1_value);
				if (dirty & /*result*/ 1 && t3_value !== (t3_value = /*result*/ ctx[0].shallowMove.to + "")) set_data_dev(t3, t3_value);
				if (dirty & /*result*/ 1 && t7_value !== (t7_value = /*result*/ ctx[0].shallowScore?.toFixed(1) + "")) set_data_dev(t7, t7_value);

				if (dirty & /*result*/ 1 && div1_class_value !== (div1_class_value = "score " + (/*result*/ ctx[0].shallowScore > 0
				? 'positive'
				: 'negative') + " svelte-nh9mc7")) {
					attr_dev(div1, "class", div1_class_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_11.name,
			type: "if",
			source: "(164:14) {#if result.shallowMove}",
			ctx
		});

		return block;
	}

	// (175:14) {#if result.deepMove}
	function create_if_block_10(ctx) {
		let div2;
		let div0;
		let t0;
		let t1_value = /*result*/ ctx[0].deepMove.from + "";
		let t1;
		let t2;
		let t3_value = /*result*/ ctx[0].deepMove.to + "";
		let t3;
		let t4;
		let t5;
		let div1;
		let t6;
		let t7_value = /*result*/ ctx[0].deepScore?.toFixed(1) + "";
		let t7;
		let div1_class_value;

		const block = {
			c: function create() {
				div2 = element("div");
				div0 = element("div");
				t0 = text("位置: [");
				t1 = text(t1_value);
				t2 = text(" → ");
				t3 = text(t3_value);
				t4 = text("]");
				t5 = space();
				div1 = element("div");
				t6 = text("分数: ");
				t7 = text(t7_value);
				add_location(div0, file$1, 176, 18, 5372);

				attr_dev(div1, "class", div1_class_value = "score " + (/*result*/ ctx[0].deepScore > 0
				? 'positive'
				: 'negative') + " svelte-nh9mc7");

				add_location(div1, file$1, 177, 18, 5453);
				attr_dev(div2, "class", "move-info svelte-nh9mc7");
				add_location(div2, file$1, 175, 16, 5330);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div0);
				append_dev(div0, t0);
				append_dev(div0, t1);
				append_dev(div0, t2);
				append_dev(div0, t3);
				append_dev(div0, t4);
				append_dev(div2, t5);
				append_dev(div2, div1);
				append_dev(div1, t6);
				append_dev(div1, t7);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*result*/ 1 && t1_value !== (t1_value = /*result*/ ctx[0].deepMove.from + "")) set_data_dev(t1, t1_value);
				if (dirty & /*result*/ 1 && t3_value !== (t3_value = /*result*/ ctx[0].deepMove.to + "")) set_data_dev(t3, t3_value);
				if (dirty & /*result*/ 1 && t7_value !== (t7_value = /*result*/ ctx[0].deepScore?.toFixed(1) + "")) set_data_dev(t7, t7_value);

				if (dirty & /*result*/ 1 && div1_class_value !== (div1_class_value = "score " + (/*result*/ ctx[0].deepScore > 0
				? 'positive'
				: 'negative') + " svelte-nh9mc7")) {
					attr_dev(div1, "class", div1_class_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_10.name,
			type: "if",
			source: "(175:14) {#if result.deepMove}",
			ctx
		});

		return block;
	}

	// (186:10) {#if result.disagreement}
	function create_if_block_9(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				div.textContent = "⚠️ 深浅层选择不一致! 浅层AI可能做出短视决定";
				attr_dev(div, "class", "disagreement-warning svelte-nh9mc7");
				add_location(div, file$1, 186, 12, 5730);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_9.name,
			type: "if",
			source: "(186:10) {#if result.disagreement}",
			ctx
		});

		return block;
	}

	// (135:12) {#if result.storedScore !== undefined}
	function create_if_block_6(ctx) {
		let div0;
		let span0;
		let t1;
		let span1;
		let t2_value = /*result*/ ctx[0].storedScore + "";
		let t2;
		let t3;
		let div1;
		let span2;
		let t5;
		let span3;
		let t6_value = /*result*/ ctx[0].actualScore + "";
		let t6;
		let t7;
		let if_block_anchor;
		let if_block = /*result*/ ctx[0].storedScore !== /*result*/ ctx[0].actualScore && create_if_block_7(ctx);

		const block = {
			c: function create() {
				div0 = element("div");
				span0 = element("span");
				span0.textContent = "存储分数:";
				t1 = space();
				span1 = element("span");
				t2 = text(t2_value);
				t3 = space();
				div1 = element("div");
				span2 = element("span");
				span2.textContent = "实际分数:";
				t5 = space();
				span3 = element("span");
				t6 = text(t6_value);
				t7 = space();
				if (if_block) if_block.c();
				if_block_anchor = empty();
				attr_dev(span0, "class", "hash-label svelte-nh9mc7");
				add_location(span0, file$1, 136, 16, 3890);
				attr_dev(span1, "class", "hash-value svelte-nh9mc7");
				add_location(span1, file$1, 137, 16, 3944);
				attr_dev(div0, "class", "hash-row svelte-nh9mc7");
				add_location(div0, file$1, 135, 14, 3851);
				attr_dev(span2, "class", "hash-label svelte-nh9mc7");
				add_location(span2, file$1, 140, 16, 4071);
				attr_dev(span3, "class", "hash-value svelte-nh9mc7");
				add_location(span3, file$1, 141, 16, 4125);
				attr_dev(div1, "class", "hash-row svelte-nh9mc7");
				add_location(div1, file$1, 139, 14, 4032);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div0, anchor);
				append_dev(div0, span0);
				append_dev(div0, t1);
				append_dev(div0, span1);
				append_dev(span1, t2);
				insert_dev(target, t3, anchor);
				insert_dev(target, div1, anchor);
				append_dev(div1, span2);
				append_dev(div1, t5);
				append_dev(div1, span3);
				append_dev(span3, t6);
				insert_dev(target, t7, anchor);
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*result*/ 1 && t2_value !== (t2_value = /*result*/ ctx[0].storedScore + "")) set_data_dev(t2, t2_value);
				if (dirty & /*result*/ 1 && t6_value !== (t6_value = /*result*/ ctx[0].actualScore + "")) set_data_dev(t6, t6_value);

				if (/*result*/ ctx[0].storedScore !== /*result*/ ctx[0].actualScore) {
					if (if_block) ; else {
						if_block = create_if_block_7(ctx);
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div0);
					detach_dev(t3);
					detach_dev(div1);
					detach_dev(t7);
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_6.name,
			type: "if",
			source: "(135:12) {#if result.storedScore !== undefined}",
			ctx
		});

		return block;
	}

	// (144:14) {#if result.storedScore !== result.actualScore}
	function create_if_block_7(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				div.textContent = "⚠️ 分数不一致! 可能存在哈希碰撞";
				attr_dev(div, "class", "collision-warning svelte-nh9mc7");
				add_location(div, file$1, 144, 16, 4277);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_7.name,
			type: "if",
			source: "(144:14) {#if result.storedScore !== result.actualScore}",
			ctx
		});

		return block;
	}

	// (111:10) {#if result.checkSequence}
	function create_if_block_4$1(ctx) {
		let div;
		let h5;
		let t1;
		let each_value_1 = ensure_array_like_dev(/*result*/ ctx[0].checkSequence);
		let each_blocks = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
		}

		const block = {
			c: function create() {
				div = element("div");
				h5 = element("h5");
				h5.textContent = "将军序列:";
				t1 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(h5, "class", "svelte-nh9mc7");
				add_location(h5, file$1, 112, 14, 3059);
				attr_dev(div, "class", "check-sequence svelte-nh9mc7");
				add_location(div, file$1, 111, 12, 3016);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, h5);
				append_dev(div, t1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*result*/ 1) {
					each_value_1 = ensure_array_like_dev(/*result*/ ctx[0].checkSequence);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_1$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_1.length;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4$1.name,
			type: "if",
			source: "(111:10) {#if result.checkSequence}",
			ctx
		});

		return block;
	}

	// (114:14) {#each result.checkSequence as item}
	function create_each_block_1$1(ctx) {
		let div;
		let t0;
		let t1_value = /*item*/ ctx[11].move + 1 + "";
		let t1;
		let t2;
		let t3_value = (/*item*/ ctx[11].inCheck ? '✅ 将军' : '❌ 无将军') + "";
		let t3;
		let t4;

		const block = {
			c: function create() {
				div = element("div");
				t0 = text("第");
				t1 = text(t1_value);
				t2 = text("步: ");
				t3 = text(t3_value);
				t4 = space();
				attr_dev(div, "class", "check-row svelte-nh9mc7");
				add_location(div, file$1, 114, 16, 3141);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, t0);
				append_dev(div, t1);
				append_dev(div, t2);
				append_dev(div, t3);
				append_dev(div, t4);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*result*/ 1 && t1_value !== (t1_value = /*item*/ ctx[11].move + 1 + "")) set_data_dev(t1, t1_value);
				if (dirty & /*result*/ 1 && t3_value !== (t3_value = (/*item*/ ctx[11].inCheck ? '✅ 将军' : '❌ 无将军') + "")) set_data_dev(t3, t3_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1$1.name,
			type: "each",
			source: "(114:14) {#each result.checkSequence as item}",
			ctx
		});

		return block;
	}

	// (87:10) {#if result.positionCounts}
	function create_if_block_2$1(ctx) {
		let div;
		let h5;
		let t1;
		let each_value = ensure_array_like_dev(Object.entries(/*result*/ ctx[0].positionCounts).slice(0, 5));
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				div = element("div");
				h5 = element("h5");
				h5.textContent = "局面出现次数:";
				t1 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(h5, "class", "svelte-nh9mc7");
				add_location(h5, file$1, 88, 14, 2169);
				attr_dev(div, "class", "position-stats svelte-nh9mc7");
				add_location(div, file$1, 87, 12, 2126);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, h5);
				append_dev(div, t1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*Object, result*/ 1) {
					each_value = ensure_array_like_dev(Object.entries(/*result*/ ctx[0].positionCounts).slice(0, 5));
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$1.name,
			type: "if",
			source: "(87:10) {#if result.positionCounts}",
			ctx
		});

		return block;
	}

	// (90:14) {#each Object.entries(result.positionCounts).slice(0, 5) as [pos, count]}
	function create_each_block$1(ctx) {
		let div;
		let span0;
		let t0_value = /*pos*/ ctx[7].slice(0, 30) + "";
		let t0;
		let t1;
		let t2;
		let span1;
		let t3_value = /*count*/ ctx[8] + "";
		let t3;
		let t4;
		let t5;

		const block = {
			c: function create() {
				div = element("div");
				span0 = element("span");
				t0 = text(t0_value);
				t1 = text("...");
				t2 = space();
				span1 = element("span");
				t3 = text(t3_value);
				t4 = text("次");
				t5 = space();
				attr_dev(span0, "class", "pos-hash svelte-nh9mc7");
				add_location(span0, file$1, 91, 18, 2330);
				attr_dev(span1, "class", "pos-count svelte-nh9mc7");
				add_location(span1, file$1, 92, 18, 2400);
				attr_dev(div, "class", "pos-row svelte-nh9mc7");
				add_location(div, file$1, 90, 16, 2290);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, span0);
				append_dev(span0, t0);
				append_dev(span0, t1);
				append_dev(div, t2);
				append_dev(div, span1);
				append_dev(span1, t3);
				append_dev(span1, t4);
				append_dev(div, t5);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*result*/ 1 && t0_value !== (t0_value = /*pos*/ ctx[7].slice(0, 30) + "")) set_data_dev(t0, t0_value);
				if (dirty & /*result*/ 1 && t3_value !== (t3_value = /*count*/ ctx[8] + "")) set_data_dev(t3, t3_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$1.name,
			type: "each",
			source: "(90:14) {#each Object.entries(result.positionCounts).slice(0, 5) as [pos, count]}",
			ctx
		});

		return block;
	}

	function create_fragment$1(ctx) {
		let div1;
		let h3;
		let t1;
		let div0;
		let t2;
		let each_value_2 = ensure_array_like_dev(/*EDGE_CASES*/ ctx[2]);
		let each_blocks = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
		}

		let if_block = /*show*/ ctx[1] && /*result*/ ctx[0] && create_if_block$1(ctx);

		const block = {
			c: function create() {
				div1 = element("div");
				h3 = element("h3");
				h3.textContent = "🔍 边界情况展示";
				t1 = space();
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t2 = space();
				if (if_block) if_block.c();
				attr_dev(h3, "class", "svelte-nh9mc7");
				add_location(h3, file$1, 59, 2, 1228);
				attr_dev(div0, "class", "edge-case-buttons svelte-nh9mc7");
				add_location(div0, file$1, 61, 2, 1250);
				attr_dev(div1, "class", "edge-cases-section svelte-nh9mc7");
				add_location(div1, file$1, 58, 0, 1193);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, h3);
				append_dev(div1, t1);
				append_dev(div1, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				append_dev(div1, t2);
				if (if_block) if_block.m(div1, null);
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*EDGE_CASES, handleTrigger*/ 12) {
					each_value_2 = ensure_array_like_dev(/*EDGE_CASES*/ ctx[2]);
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_2$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_2.length;
				}

				if (/*show*/ ctx[1] && /*result*/ ctx[0]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$1(ctx);
						if_block.c();
						if_block.m(div1, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}

				destroy_each(each_blocks, detaching);
				if (if_block) if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$1.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function getResultColor(result) {
		if (!result) return '#888';

		const colorMap = {
			threefold: '#f39c12',
			'perpetual-check': '#e74c3c',
			'zobrist-collision': '#9b59b6',
			'depth-exhaustion': '#3498db'
		};

		return colorMap[result.caseType] || '#888';
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('EdgeCases', slots, []);
		const dispatch = createEventDispatcher();
		let { result = null } = $$props;
		let { show = false } = $$props;

		const EDGE_CASES = [
			{
				type: 'threefold',
				name: '三维重复局面',
				icon: '🔄',
				description: '演示三次重复局面导致的死循环',
				color: '#f39c12'
			},
			{
				type: 'perpetual-check',
				name: '长将规则',
				icon: '⚔️',
				description: '长将规则在非对称棋类中可能失效',
				color: '#e74c3c'
			},
			{
				type: 'zobrist-collision',
				name: 'Zobrist碰撞',
				icon: '💥',
				description: 'Zobrist哈希碰撞引发的置换表错误',
				color: '#9b59b6'
			},
			{
				type: 'depth-exhaustion',
				name: '深度耗尽',
				icon: '🌑',
				description: '搜索深度耗尽时的盲目弃子行为',
				color: '#3498db'
			}
		];

		function handleTrigger(type) {
			dispatch('trigger', { type });
		}

		function handleClose() {
			dispatch('close');
		}

		const writable_props = ['result', 'show'];

		Object_1.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<EdgeCases> was created with unknown prop '${key}'`);
		});

		const func = ec => handleTrigger(ec.type);

		$$self.$$set = $$props => {
			if ('result' in $$props) $$invalidate(0, result = $$props.result);
			if ('show' in $$props) $$invalidate(1, show = $$props.show);
		};

		$$self.$capture_state = () => ({
			createEventDispatcher,
			dispatch,
			result,
			show,
			EDGE_CASES,
			handleTrigger,
			handleClose,
			getResultColor
		});

		$$self.$inject_state = $$props => {
			if ('result' in $$props) $$invalidate(0, result = $$props.result);
			if ('show' in $$props) $$invalidate(1, show = $$props.show);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [result, show, EDGE_CASES, handleTrigger, handleClose, func];
	}

	class EdgeCases extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { result: 0, show: 1 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "EdgeCases",
				options,
				id: create_fragment$1.name
			});
		}

		get result() {
			throw new Error("<EdgeCases>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set result(value) {
			throw new Error("<EdgeCases>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get show() {
			throw new Error("<EdgeCases>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set show(value) {
			throw new Error("<EdgeCases>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\App.svelte generated by Svelte v4.2.20 */

	const { console: console_1 } = globals;
	const file = "src\\App.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[42] = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[42] = list[i];
		return child_ctx;
	}

	function get_each_context_2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[47] = list[i];
		return child_ctx;
	}

	// (295:6) {#if inCheck}
	function create_if_block_5(ctx) {
		let span;

		const block = {
			c: function create() {
				span = element("span");
				span.textContent = "⚠️ 将军!";
				attr_dev(span, "class", "check-warning svelte-144k6ku");
				add_location(span, file, 295, 8, 8370);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(span);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_5.name,
			type: "if",
			source: "(295:6) {#if inCheck}",
			ctx
		});

		return block;
	}

	// (306:10) {#each presets as preset}
	function create_each_block_2(ctx) {
		let button;
		let t0_value = /*preset*/ ctx[47].name + "";
		let t0;
		let t1;
		let button_class_value;
		let button_onclick_value;

		function func() {
			return /*func*/ ctx[28](/*preset*/ ctx[47]);
		}

		const block = {
			c: function create() {
				button = element("button");
				t0 = text(t0_value);
				t1 = space();

				attr_dev(button, "class", button_class_value = "preset-btn " + (/*activePreset*/ ctx[21] === /*preset*/ ctx[47].name
				? 'active'
				: '') + " svelte-144k6ku");

				attr_dev(button, "onclick", button_onclick_value = func);
				add_location(button, file, 306, 12, 8649);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);
				append_dev(button, t0);
				append_dev(button, t1);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty[0] & /*presets*/ 1048576 && t0_value !== (t0_value = /*preset*/ ctx[47].name + "")) set_data_dev(t0, t0_value);

				if (dirty[0] & /*activePreset, presets*/ 3145728 && button_class_value !== (button_class_value = "preset-btn " + (/*activePreset*/ ctx[21] === /*preset*/ ctx[47].name
				? 'active'
				: '') + " svelte-144k6ku")) {
					attr_dev(button, "class", button_class_value);
				}

				if (dirty[0] & /*presets*/ 1048576 && button_onclick_value !== (button_onclick_value = func)) {
					attr_dev(button, "onclick", button_onclick_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2.name,
			type: "each",
			source: "(306:10) {#each presets as preset}",
			ctx
		});

		return block;
	}

	// (324:6) {#if showSearchTree && searchTreeData}
	function create_if_block_4(ctx) {
		let searchtree;
		let current;

		searchtree = new SearchTree({
				props: { data: /*searchTreeData*/ ctx[11] },
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(searchtree.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(searchtree, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const searchtree_changes = {};
				if (dirty[0] & /*searchTreeData*/ 2048) searchtree_changes.data = /*searchTreeData*/ ctx[11];
				searchtree.$set(searchtree_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(searchtree.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(searchtree.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(searchtree, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4.name,
			type: "if",
			source: "(324:6) {#if showSearchTree && searchTreeData}",
			ctx
		});

		return block;
	}

	// (342:6) {#if gameOver && gameOver.over}
	function create_if_block_1(ctx) {
		let div;
		let t0;
		let button;
		let t1;

		function select_block_type(ctx, dirty) {
			if (/*gameOver*/ ctx[4].result === 'checkmate') return create_if_block_2;
			if (/*gameOver*/ ctx[4].result === 'stalemate') return create_if_block_3;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type && current_block_type(ctx);

		const block = {
			c: function create() {
				div = element("div");
				if (if_block) if_block.c();
				t0 = space();
				button = element("button");
				t1 = text("再来一局");
				attr_dev(button, "class", "reset-btn svelte-144k6ku");
				attr_dev(button, "onclick", /*resetGame*/ ctx[26]);
				add_location(button, file, 348, 10, 9957);
				attr_dev(div, "class", "game-over-banner svelte-144k6ku");
				add_location(div, file, 342, 8, 9690);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				if (if_block) if_block.m(div, null);
				append_dev(div, t0);
				append_dev(div, button);
				append_dev(button, t1);
			},
			p: function update(ctx, dirty) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if (if_block) if_block.d(1);
					if_block = current_block_type && current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div, t0);
					}
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (if_block) {
					if_block.d();
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1.name,
			type: "if",
			source: "(342:6) {#if gameOver && gameOver.over}",
			ctx
		});

		return block;
	}

	// (346:52) 
	function create_if_block_3(ctx) {
		let h2;

		const block = {
			c: function create() {
				h2 = element("h2");
				h2.textContent = "🤝 逼和! 游戏平局";
				attr_dev(h2, "class", "svelte-144k6ku");
				add_location(h2, file, 346, 12, 9910);
			},
			m: function mount(target, anchor) {
				insert_dev(target, h2, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(h2);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3.name,
			type: "if",
			source: "(346:52) ",
			ctx
		});

		return block;
	}

	// (344:10) {#if gameOver.result === 'checkmate'}
	function create_if_block_2(ctx) {
		let h2;
		let t0;
		let t1_value = (/*gameOver*/ ctx[4].winner === 'north' ? '北方' : '南方') + "";
		let t1;
		let t2;

		const block = {
			c: function create() {
				h2 = element("h2");
				t0 = text("🏆 将死! ");
				t1 = text(t1_value);
				t2 = text(" 获胜!");
				attr_dev(h2, "class", "svelte-144k6ku");
				add_location(h2, file, 344, 12, 9781);
			},
			m: function mount(target, anchor) {
				insert_dev(target, h2, anchor);
				append_dev(h2, t0);
				append_dev(h2, t1);
				append_dev(h2, t2);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*gameOver*/ 16 && t1_value !== (t1_value = (/*gameOver*/ ctx[4].winner === 'north' ? '北方' : '南方') + "")) set_data_dev(t1, t1_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(h2);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2.name,
			type: "if",
			source: "(344:10) {#if gameOver.result === 'checkmate'}",
			ctx
		});

		return block;
	}

	// (361:14) {#each capturedPieces.north as p}
	function create_each_block_1(ctx) {
		let span;
		let t_value = /*p*/ ctx[42].type + "";
		let t;

		const block = {
			c: function create() {
				span = element("span");
				t = text(t_value);
				attr_dev(span, "class", "captured-piece south svelte-144k6ku");
				add_location(span, file, 361, 16, 10349);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
				append_dev(span, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*capturedPieces*/ 32768 && t_value !== (t_value = /*p*/ ctx[42].type + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(span);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1.name,
			type: "each",
			source: "(361:14) {#each capturedPieces.north as p}",
			ctx
		});

		return block;
	}

	// (369:14) {#each capturedPieces.south as p}
	function create_each_block(ctx) {
		let span;
		let t_value = /*p*/ ctx[42].type + "";
		let t;

		const block = {
			c: function create() {
				span = element("span");
				t = text(t_value);
				attr_dev(span, "class", "captured-piece north svelte-144k6ku");
				add_location(span, file, 369, 16, 10627);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
				append_dev(span, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*capturedPieces*/ 32768 && t_value !== (t_value = /*p*/ ctx[42].type + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(span);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block.name,
			type: "each",
			source: "(369:14) {#each capturedPieces.south as p}",
			ctx
		});

		return block;
	}

	// (386:2) {#if aiResult && aiResult.stats}
	function create_if_block(ctx) {
		let div1;
		let h4;
		let t1;
		let div0;
		let span0;
		let t2;
		let t3_value = /*aiResult*/ ctx[10].stats.nodesExplored + "";
		let t3;
		let t4;
		let span1;
		let t5;
		let t6_value = /*aiResult*/ ctx[10].stats.maxDepth + "";
		let t6;
		let t7;
		let span2;
		let t8;
		let t9_value = /*aiResult*/ ctx[10].stats.cutoffs + "";
		let t9;
		let t10;
		let span3;
		let t11;
		let t12_value = /*aiResult*/ ctx[10].stats.transpositionHits + "";
		let t12;
		let t13;
		let span4;
		let t14;
		let t15_value = /*aiResult*/ ctx[10].stats.timeMs + "";
		let t15;
		let t16;
		let t17;
		let span5;
		let t18;
		let t19_value = /*aiResult*/ ctx[10].score + "";
		let t19;

		const block = {
			c: function create() {
				div1 = element("div");
				h4 = element("h4");
				h4.textContent = "AI 搜索统计";
				t1 = space();
				div0 = element("div");
				span0 = element("span");
				t2 = text("节点数: ");
				t3 = text(t3_value);
				t4 = space();
				span1 = element("span");
				t5 = text("最大深度: ");
				t6 = text(t6_value);
				t7 = space();
				span2 = element("span");
				t8 = text("剪枝次数: ");
				t9 = text(t9_value);
				t10 = space();
				span3 = element("span");
				t11 = text("置换表命中: ");
				t12 = text(t12_value);
				t13 = space();
				span4 = element("span");
				t14 = text("耗时: ");
				t15 = text(t15_value);
				t16 = text("ms");
				t17 = space();
				span5 = element("span");
				t18 = text("评估分: ");
				t19 = text(t19_value);
				attr_dev(h4, "class", "svelte-144k6ku");
				add_location(h4, file, 387, 6, 11053);
				add_location(span0, file, 389, 8, 11108);
				add_location(span1, file, 390, 8, 11165);
				add_location(span2, file, 391, 8, 11218);
				add_location(span3, file, 392, 8, 11270);
				add_location(span4, file, 393, 8, 11333);
				add_location(span5, file, 394, 8, 11384);
				attr_dev(div0, "class", "stat-grid svelte-144k6ku");
				add_location(div0, file, 388, 6, 11076);
				attr_dev(div1, "class", "ai-stats-panel svelte-144k6ku");
				add_location(div1, file, 386, 4, 11018);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, h4);
				append_dev(div1, t1);
				append_dev(div1, div0);
				append_dev(div0, span0);
				append_dev(span0, t2);
				append_dev(span0, t3);
				append_dev(div0, t4);
				append_dev(div0, span1);
				append_dev(span1, t5);
				append_dev(span1, t6);
				append_dev(div0, t7);
				append_dev(div0, span2);
				append_dev(span2, t8);
				append_dev(span2, t9);
				append_dev(div0, t10);
				append_dev(div0, span3);
				append_dev(span3, t11);
				append_dev(span3, t12);
				append_dev(div0, t13);
				append_dev(div0, span4);
				append_dev(span4, t14);
				append_dev(span4, t15);
				append_dev(span4, t16);
				append_dev(div0, t17);
				append_dev(div0, span5);
				append_dev(span5, t18);
				append_dev(span5, t19);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*aiResult*/ 1024 && t3_value !== (t3_value = /*aiResult*/ ctx[10].stats.nodesExplored + "")) set_data_dev(t3, t3_value);
				if (dirty[0] & /*aiResult*/ 1024 && t6_value !== (t6_value = /*aiResult*/ ctx[10].stats.maxDepth + "")) set_data_dev(t6, t6_value);
				if (dirty[0] & /*aiResult*/ 1024 && t9_value !== (t9_value = /*aiResult*/ ctx[10].stats.cutoffs + "")) set_data_dev(t9, t9_value);
				if (dirty[0] & /*aiResult*/ 1024 && t12_value !== (t12_value = /*aiResult*/ ctx[10].stats.transpositionHits + "")) set_data_dev(t12, t12_value);
				if (dirty[0] & /*aiResult*/ 1024 && t15_value !== (t15_value = /*aiResult*/ ctx[10].stats.timeMs + "")) set_data_dev(t15, t15_value);
				if (dirty[0] & /*aiResult*/ 1024 && t19_value !== (t19_value = /*aiResult*/ ctx[10].score + "")) set_data_dev(t19, t19_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block.name,
			type: "if",
			source: "(386:2) {#if aiResult && aiResult.stats}",
			ctx
		});

		return block;
	}

	function create_fragment(ctx) {
		let t0;
		let div12;
		let header;
		let h1;
		let t2;
		let div0;
		let span0;
		let t3;
		let span0_class_value;
		let t4;
		let span1;
		let t5;
		let t6;
		let t7;
		let span2;
		let t8;
		let t9_value = (/*evaluation*/ ctx[5] > 0 ? '+' : '') + "";
		let t9;
		let t10;
		let t11;
		let t12;
		let main;
		let div3;
		let div2;
		let h30;
		let t14;
		let div1;
		let t15;
		let gamecontrols;
		let t16;
		let t17;
		let div4;
		let board_1;
		let t18;
		let t19;
		let div11;
		let div10;
		let h31;
		let t21;
		let div9;
		let div6;
		let h40;
		let t23;
		let div5;
		let t24;
		let div8;
		let h41;
		let t26;
		let div7;
		let t27;
		let edgecases;
		let t28;
		let current;
		let if_block0 = /*inCheck*/ ctx[3] && create_if_block_5(ctx);
		let each_value_2 = ensure_array_like_dev(/*presets*/ ctx[20]);
		let each_blocks_2 = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
		}

		gamecontrols = new GameControls({
				props: {
					aiThinking: /*aiThinking*/ ctx[9],
					gameOver: /*gameOver*/ ctx[4],
					showSearchTree: /*showSearchTree*/ ctx[12]
				},
				$$inline: true
			});

		gamecontrols.$on("reset", /*resetGame*/ ctx[26]);
		gamecontrols.$on("aiMove", /*aiMove*/ ctx[25]);
		gamecontrols.$on("toggleSearchTree", /*toggleSearchTree_handler*/ ctx[29]);
		let if_block1 = /*showSearchTree*/ ctx[12] && /*searchTreeData*/ ctx[11] && create_if_block_4(ctx);

		board_1 = new Board({
				props: {
					board: /*board*/ ctx[1],
					selectedPiece: /*selectedPiece*/ ctx[6],
					legalMoves: /*legalMoves*/ ctx[7],
					lastMove: /*lastMove*/ ctx[8],
					flippingPiece: /*flippingPiece*/ ctx[19],
					invalidMoveError: /*invalidMoveError*/ ctx[16],
					moveProgress: /*moveProgress*/ ctx[17],
					particles: /*particles*/ ctx[18]
				},
				$$inline: true
			});

		board_1.$on("squareClick", /*squareClick_handler*/ ctx[30]);
		let if_block2 = /*gameOver*/ ctx[4] && /*gameOver*/ ctx[4].over && create_if_block_1(ctx);
		let each_value_1 = ensure_array_like_dev(/*capturedPieces*/ ctx[15].north);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		let each_value = ensure_array_like_dev(/*capturedPieces*/ ctx[15].south);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		edgecases = new EdgeCases({
				props: {
					result: /*edgeCaseResult*/ ctx[14],
					show: /*showEdgeCases*/ ctx[13]
				},
				$$inline: true
			});

		edgecases.$on("trigger", /*trigger_handler*/ ctx[31]);
		edgecases.$on("close", /*close_handler*/ ctx[32]);
		let if_block3 = /*aiResult*/ ctx[10] && /*aiResult*/ ctx[10].stats && create_if_block(ctx);

		const block = {
			c: function create() {
				t0 = space();
				div12 = element("div");
				header = element("header");
				h1 = element("h1");
				h1.textContent = "🎯 非对称棋类 · AI对弈系统";
				t2 = space();
				div0 = element("div");
				span0 = element("span");
				t3 = text(/*currentPlayerName*/ ctx[22]);
				t4 = space();
				span1 = element("span");
				t5 = text("回合: ");
				t6 = text(/*moveCount*/ ctx[2]);
				t7 = space();
				span2 = element("span");
				t8 = text("评估: ");
				t9 = text(t9_value);
				t10 = text(/*evaluation*/ ctx[5]);
				t11 = space();
				if (if_block0) if_block0.c();
				t12 = space();
				main = element("main");
				div3 = element("div");
				div2 = element("div");
				h30 = element("h3");
				h30.textContent = "场景预设";
				t14 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].c();
				}

				t15 = space();
				create_component(gamecontrols.$$.fragment);
				t16 = space();
				if (if_block1) if_block1.c();
				t17 = space();
				div4 = element("div");
				create_component(board_1.$$.fragment);
				t18 = space();
				if (if_block2) if_block2.c();
				t19 = space();
				div11 = element("div");
				div10 = element("div");
				h31 = element("h3");
				h31.textContent = "吃子记录";
				t21 = space();
				div9 = element("div");
				div6 = element("div");
				h40 = element("h4");
				h40.textContent = "南方被吃";
				t23 = space();
				div5 = element("div");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t24 = space();
				div8 = element("div");
				h41 = element("h4");
				h41.textContent = "北方被吃";
				t26 = space();
				div7 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t27 = space();
				create_component(edgecases.$$.fragment);
				t28 = space();
				if (if_block3) if_block3.c();
				document.title = "非对称棋类 AI对弈系统";
				attr_dev(h1, "class", "svelte-144k6ku");
				add_location(h1, file, 289, 4, 8074);
				attr_dev(span0, "class", span0_class_value = "player-badge " + /*currentPlayer*/ ctx[0] + " svelte-144k6ku");
				add_location(span0, file, 291, 6, 8136);
				attr_dev(span1, "class", "move-count svelte-144k6ku");
				add_location(span1, file, 292, 6, 8212);
				attr_dev(span2, "class", "evaluation svelte-144k6ku");
				add_location(span2, file, 293, 6, 8266);
				attr_dev(div0, "class", "status-bar svelte-144k6ku");
				add_location(div0, file, 290, 4, 8105);
				attr_dev(header, "class", "header svelte-144k6ku");
				add_location(header, file, 288, 2, 8046);
				attr_dev(h30, "class", "svelte-144k6ku");
				add_location(h30, file, 303, 8, 8550);
				attr_dev(div1, "class", "preset-buttons svelte-144k6ku");
				add_location(div1, file, 304, 8, 8572);
				attr_dev(div2, "class", "preset-section svelte-144k6ku");
				add_location(div2, file, 302, 6, 8513);
				attr_dev(div3, "class", "left-panel svelte-144k6ku");
				add_location(div3, file, 301, 4, 8482);
				attr_dev(div4, "class", "center-panel svelte-144k6ku");
				add_location(div4, file, 328, 4, 9252);
				attr_dev(h31, "class", "svelte-144k6ku");
				add_location(h31, file, 355, 8, 10131);
				attr_dev(h40, "class", "svelte-144k6ku");
				add_location(h40, file, 358, 12, 10229);
				attr_dev(div5, "class", "captured-pieces svelte-144k6ku");
				add_location(div5, file, 359, 12, 10255);
				attr_dev(div6, "class", "captured-col svelte-144k6ku");
				add_location(div6, file, 357, 10, 10190);
				attr_dev(h41, "class", "svelte-144k6ku");
				add_location(h41, file, 366, 12, 10507);
				attr_dev(div7, "class", "captured-pieces svelte-144k6ku");
				add_location(div7, file, 367, 12, 10533);
				attr_dev(div8, "class", "captured-col svelte-144k6ku");
				add_location(div8, file, 365, 10, 10468);
				attr_dev(div9, "class", "captured-row svelte-144k6ku");
				add_location(div9, file, 356, 8, 10153);
				attr_dev(div10, "class", "captured-section svelte-144k6ku");
				add_location(div10, file, 354, 6, 10092);
				attr_dev(div11, "class", "right-panel svelte-144k6ku");
				add_location(div11, file, 353, 4, 10060);
				attr_dev(main, "class", "main-content svelte-144k6ku");
				add_location(main, file, 300, 2, 8450);
				attr_dev(div12, "class", "app-container svelte-144k6ku");
				add_location(div12, file, 287, 0, 8016);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t0, anchor);
				insert_dev(target, div12, anchor);
				append_dev(div12, header);
				append_dev(header, h1);
				append_dev(header, t2);
				append_dev(header, div0);
				append_dev(div0, span0);
				append_dev(span0, t3);
				append_dev(div0, t4);
				append_dev(div0, span1);
				append_dev(span1, t5);
				append_dev(span1, t6);
				append_dev(div0, t7);
				append_dev(div0, span2);
				append_dev(span2, t8);
				append_dev(span2, t9);
				append_dev(span2, t10);
				append_dev(div0, t11);
				if (if_block0) if_block0.m(div0, null);
				append_dev(div12, t12);
				append_dev(div12, main);
				append_dev(main, div3);
				append_dev(div3, div2);
				append_dev(div2, h30);
				append_dev(div2, t14);
				append_dev(div2, div1);

				for (let i = 0; i < each_blocks_2.length; i += 1) {
					if (each_blocks_2[i]) {
						each_blocks_2[i].m(div1, null);
					}
				}

				append_dev(div3, t15);
				mount_component(gamecontrols, div3, null);
				append_dev(div3, t16);
				if (if_block1) if_block1.m(div3, null);
				append_dev(main, t17);
				append_dev(main, div4);
				mount_component(board_1, div4, null);
				append_dev(div4, t18);
				if (if_block2) if_block2.m(div4, null);
				append_dev(main, t19);
				append_dev(main, div11);
				append_dev(div11, div10);
				append_dev(div10, h31);
				append_dev(div10, t21);
				append_dev(div10, div9);
				append_dev(div9, div6);
				append_dev(div6, h40);
				append_dev(div6, t23);
				append_dev(div6, div5);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div5, null);
					}
				}

				append_dev(div9, t24);
				append_dev(div9, div8);
				append_dev(div8, h41);
				append_dev(div8, t26);
				append_dev(div8, div7);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div7, null);
					}
				}

				append_dev(div11, t27);
				mount_component(edgecases, div11, null);
				append_dev(div12, t28);
				if (if_block3) if_block3.m(div12, null);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (!current || dirty[0] & /*currentPlayerName*/ 4194304) set_data_dev(t3, /*currentPlayerName*/ ctx[22]);

				if (!current || dirty[0] & /*currentPlayer*/ 1 && span0_class_value !== (span0_class_value = "player-badge " + /*currentPlayer*/ ctx[0] + " svelte-144k6ku")) {
					attr_dev(span0, "class", span0_class_value);
				}

				if (!current || dirty[0] & /*moveCount*/ 4) set_data_dev(t6, /*moveCount*/ ctx[2]);
				if ((!current || dirty[0] & /*evaluation*/ 32) && t9_value !== (t9_value = (/*evaluation*/ ctx[5] > 0 ? '+' : '') + "")) set_data_dev(t9, t9_value);
				if (!current || dirty[0] & /*evaluation*/ 32) set_data_dev(t10, /*evaluation*/ ctx[5]);

				if (/*inCheck*/ ctx[3]) {
					if (if_block0) ; else {
						if_block0 = create_if_block_5(ctx);
						if_block0.c();
						if_block0.m(div0, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (dirty[0] & /*activePreset, presets, loadPreset*/ 11534336) {
					each_value_2 = ensure_array_like_dev(/*presets*/ ctx[20]);
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2(ctx, each_value_2, i);

						if (each_blocks_2[i]) {
							each_blocks_2[i].p(child_ctx, dirty);
						} else {
							each_blocks_2[i] = create_each_block_2(child_ctx);
							each_blocks_2[i].c();
							each_blocks_2[i].m(div1, null);
						}
					}

					for (; i < each_blocks_2.length; i += 1) {
						each_blocks_2[i].d(1);
					}

					each_blocks_2.length = each_value_2.length;
				}

				const gamecontrols_changes = {};
				if (dirty[0] & /*aiThinking*/ 512) gamecontrols_changes.aiThinking = /*aiThinking*/ ctx[9];
				if (dirty[0] & /*gameOver*/ 16) gamecontrols_changes.gameOver = /*gameOver*/ ctx[4];
				if (dirty[0] & /*showSearchTree*/ 4096) gamecontrols_changes.showSearchTree = /*showSearchTree*/ ctx[12];
				gamecontrols.$set(gamecontrols_changes);

				if (/*showSearchTree*/ ctx[12] && /*searchTreeData*/ ctx[11]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);

						if (dirty[0] & /*showSearchTree, searchTreeData*/ 6144) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block_4(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(div3, null);
					}
				} else if (if_block1) {
					group_outros();

					transition_out(if_block1, 1, 1, () => {
						if_block1 = null;
					});

					check_outros();
				}

				const board_1_changes = {};
				if (dirty[0] & /*board*/ 2) board_1_changes.board = /*board*/ ctx[1];
				if (dirty[0] & /*selectedPiece*/ 64) board_1_changes.selectedPiece = /*selectedPiece*/ ctx[6];
				if (dirty[0] & /*legalMoves*/ 128) board_1_changes.legalMoves = /*legalMoves*/ ctx[7];
				if (dirty[0] & /*lastMove*/ 256) board_1_changes.lastMove = /*lastMove*/ ctx[8];
				if (dirty[0] & /*flippingPiece*/ 524288) board_1_changes.flippingPiece = /*flippingPiece*/ ctx[19];
				if (dirty[0] & /*invalidMoveError*/ 65536) board_1_changes.invalidMoveError = /*invalidMoveError*/ ctx[16];
				if (dirty[0] & /*moveProgress*/ 131072) board_1_changes.moveProgress = /*moveProgress*/ ctx[17];
				if (dirty[0] & /*particles*/ 262144) board_1_changes.particles = /*particles*/ ctx[18];
				board_1.$set(board_1_changes);

				if (/*gameOver*/ ctx[4] && /*gameOver*/ ctx[4].over) {
					if (if_block2) {
						if_block2.p(ctx, dirty);
					} else {
						if_block2 = create_if_block_1(ctx);
						if_block2.c();
						if_block2.m(div4, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if (dirty[0] & /*capturedPieces*/ 32768) {
					each_value_1 = ensure_array_like_dev(/*capturedPieces*/ ctx[15].north);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
						} else {
							each_blocks_1[i] = create_each_block_1(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(div5, null);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}

					each_blocks_1.length = each_value_1.length;
				}

				if (dirty[0] & /*capturedPieces*/ 32768) {
					each_value = ensure_array_like_dev(/*capturedPieces*/ ctx[15].south);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div7, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}

				const edgecases_changes = {};
				if (dirty[0] & /*edgeCaseResult*/ 16384) edgecases_changes.result = /*edgeCaseResult*/ ctx[14];
				if (dirty[0] & /*showEdgeCases*/ 8192) edgecases_changes.show = /*showEdgeCases*/ ctx[13];
				edgecases.$set(edgecases_changes);

				if (/*aiResult*/ ctx[10] && /*aiResult*/ ctx[10].stats) {
					if (if_block3) {
						if_block3.p(ctx, dirty);
					} else {
						if_block3 = create_if_block(ctx);
						if_block3.c();
						if_block3.m(div12, null);
					}
				} else if (if_block3) {
					if_block3.d(1);
					if_block3 = null;
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(gamecontrols.$$.fragment, local);
				transition_in(if_block1);
				transition_in(board_1.$$.fragment, local);
				transition_in(edgecases.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(gamecontrols.$$.fragment, local);
				transition_out(if_block1);
				transition_out(board_1.$$.fragment, local);
				transition_out(edgecases.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(div12);
				}

				if (if_block0) if_block0.d();
				destroy_each(each_blocks_2, detaching);
				destroy_component(gamecontrols);
				if (if_block1) if_block1.d();
				destroy_component(board_1);
				if (if_block2) if_block2.d();
				destroy_each(each_blocks_1, detaching);
				destroy_each(each_blocks, detaching);
				destroy_component(edgecases);
				if (if_block3) if_block3.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	const API_BASE = 'http://localhost:3001/api';

	function instance($$self, $$props, $$invalidate) {
		let currentPlayerName;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('App', slots, []);
		let board = [];
		let currentPlayer = 'north';
		let moveCount = 0;
		let stateHash = '';
		let history = [];
		let inCheck = false;
		let gameOver = null;
		let evaluation = 0;
		let selectedPiece = null;
		let legalMoves = [];
		let lastMove = null;
		let aiThinking = false;
		let aiResult = null;
		let searchTreeData = null;
		let showSearchTree = false;
		let showEdgeCases = false;
		let edgeCaseResult = null;
		let capturedPieces = { north: [], south: [] };
		let invalidMoveError = null;
		let moveProgress = [];
		let particles = [];
		let flippingPiece = null;
		let gameId = null;
		let presets = [];
		let activePreset = null;

		async function fetchGameState() {
			try {
				const res = await fetch(`${API_BASE}/game/state`);
				const data = await res.json();
				$$invalidate(1, board = data.board);
				$$invalidate(0, currentPlayer = data.currentPlayer);
				$$invalidate(2, moveCount = data.moveCount);
				stateHash = data.stateHash;
				history = data.history;
				$$invalidate(3, inCheck = data.inCheck);
				$$invalidate(4, gameOver = data.gameOver);
				$$invalidate(5, evaluation = data.evaluation);
			} catch(e) {
				console.error(e);
			}
		}

		async function loadPreset(presetId) {
			try {
				const res = await fetch(`${API_BASE}/preset/${presetId}`);
				const preset = await res.json();
				$$invalidate(1, board = preset.board);
				$$invalidate(0, currentPlayer = preset.currentPlayer);
				$$invalidate(2, moveCount = preset.moveCount);
				$$invalidate(21, activePreset = preset.name);
				$$invalidate(6, selectedPiece = null);
				$$invalidate(7, legalMoves = []);
				history = [];
				$$invalidate(4, gameOver = null);
				$$invalidate(3, inCheck = false);
				$$invalidate(8, lastMove = null);
				$$invalidate(17, moveProgress = []);
				await tick();
			} catch(e) {
				console.error(e);
			}
		}

		async function loadPresets() {
			try {
				const res = await fetch(`${API_BASE}/preset/`);
				const data = await res.json();
				$$invalidate(20, presets = data.presets);
			} catch(e) {
				console.error(e);
			}
		}

		async function handleSquareClick(x, y) {
			if (gameOver && gameOver.over) return;
			if (aiThinking) return;
			const piece = board[x][y];

			if (selectedPiece) {
				const validMove = legalMoves.find(m => m.to[0] === x && m.to[1] === y);

				if (validMove) {
					await makeMove(selectedPiece.from, [x, y]);
					$$invalidate(6, selectedPiece = null);
					$$invalidate(7, legalMoves = []);
					return;
				}

				if (piece && piece.side === currentPlayer) {
					await fetchLegalMoves(x, y);

					$$invalidate(6, selectedPiece = {
						from: [x, y],
						type: piece.type,
						side: piece.side
					});

					return;
				}

				$$invalidate(6, selectedPiece = null);
				$$invalidate(7, legalMoves = []);
			} else if (piece && piece.side === currentPlayer) {
				await fetchLegalMoves(x, y);

				$$invalidate(6, selectedPiece = {
					from: [x, y],
					type: piece.type,
					side: piece.side
				});
			}
		}

		async function fetchLegalMoves(x, y) {
			try {
				const res = await fetch(`${API_BASE}/game/moves/${x}/${y}`);
				const data = await res.json();
				$$invalidate(7, legalMoves = data.moves || []);
			} catch(e) {
				$$invalidate(7, legalMoves = []);
			}
		}

		async function makeMove(from, to) {
			$$invalidate(17, moveProgress = []);

			for (let i = 0; i <= 8; i++) {
				moveProgress.push({ active: false });
			}

			await tick();

			try {
				const res = await fetch(`${API_BASE}/game/move`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ from, to })
				});

				if (!res.ok) {
					const err = await res.json();
					showInvalidMoveError(from, to);
					return;
				}

				const data = await res.json();

				if (data.captured) {
					createCaptureParticles(to[0], to[1], data.captured.side);
					capturedPieces[data.captured.side === 'north' ? 'south' : 'north'].push(data.captured);
				}

				if (data.special && data.special.type === 'promotion') {
					$$invalidate(19, flippingPiece = {
						x: to[0],
						y: to[1],
						from: data.special.from,
						to: data.special.to,
						side: currentPlayer
					});
				}

				$$invalidate(1, board = data.newState.board);
				$$invalidate(0, currentPlayer = data.newState.currentPlayer);
				$$invalidate(2, moveCount = data.newState.moveCount);
				stateHash = data.newState.stateHash;
				$$invalidate(3, inCheck = data.newState.inCheck);
				$$invalidate(4, gameOver = data.newState.gameOver);
				$$invalidate(5, evaluation = data.newState.evaluation);

				history = [
					...history,
					{
						from,
						to,
						pieceType: board[to[0]]?.[to[1]]?.type
					}
				];

				$$invalidate(8, lastMove = { from, to });

				for (let i = 0; i < moveProgress.length; i++) {
					$$invalidate(17, moveProgress[i].active = true, moveProgress);
					await new Promise(r => setTimeout(r, 30));
				}

				await tick();

				if (flippingPiece) {
					setTimeout(
						() => {
							$$invalidate(19, flippingPiece = null);
						},
						800
					);
				}
			} catch(e) {
				console.error(e);
				showInvalidMoveError(from, to);
			}
		}

		function showInvalidMoveError(from, to) {
			$$invalidate(16, invalidMoveError = { from, to, time: Date.now() });

			setTimeout(
				() => {
					$$invalidate(16, invalidMoveError = null);
				},
				1500
			);
		}

		function createCaptureParticles(x, y, side) {
			for (let i = 0; i < 12; i++) {
				const angle = i / 12 * Math.PI * 2;
				const speed = 2 + Math.random() * 3;

				particles.push({
					id: Math.random().toString(36),
					x,
					y,
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed,
					life: 1.0,
					color: side === 'north' ? '#e74c3c' : '#3498db',
					size: 4 + Math.random() * 4
				});
			}
		}

		async function aiMove() {
			if (aiThinking) return;
			$$invalidate(9, aiThinking = true);
			$$invalidate(11, searchTreeData = null);

			try {
				const res = await fetch(`${API_BASE}/ai/move-ai`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ depth: 4, timeLimit: 5000 })
				});

				const data = await res.json();
				$$invalidate(10, aiResult = data);
				$$invalidate(11, searchTreeData = data.searchTree);
				$$invalidate(12, showSearchTree = true);

				if (data.captured) {
					createCaptureParticles(data.move.to[0], data.move.to[1], data.captured.side);
					capturedPieces[data.captured.side === 'north' ? 'south' : 'north'].push(data.captured);
				}

				$$invalidate(1, board = data.newState.board);
				$$invalidate(0, currentPlayer = data.newState.currentPlayer);
				$$invalidate(2, moveCount = data.newState.moveCount);
				stateHash = data.newState.stateHash;
				$$invalidate(3, inCheck = data.newState.inCheck);
				$$invalidate(4, gameOver = data.newState.gameOver);
				$$invalidate(5, evaluation = data.newState.evaluation);
				$$invalidate(8, lastMove = data.move);
			} catch(e) {
				console.error(e);
			}

			$$invalidate(9, aiThinking = false);
		}

		async function resetGame() {
			try {
				await fetch(`${API_BASE}/game/reset`, { method: 'POST' });
				await fetchGameState();
				$$invalidate(6, selectedPiece = null);
				$$invalidate(7, legalMoves = []);
				$$invalidate(8, lastMove = null);
				history = [];
				$$invalidate(15, capturedPieces = { north: [], south: [] });
				$$invalidate(4, gameOver = null);
				$$invalidate(10, aiResult = null);
				$$invalidate(11, searchTreeData = null);
			} catch(e) {
				console.error(e);
			}
		}

		async function handleEdgeCase(type) {
			try {
				const res = await fetch(`${API_BASE}/ai/edge-case/${type}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						board,
						side: currentPlayer,
						moves: history.slice(-6)
					})
				});

				$$invalidate(14, edgeCaseResult = await res.json());
				$$invalidate(13, showEdgeCases = true);
			} catch(e) {
				console.error(e);
			}
		}

		onMount(async () => {
			await fetchGameState();
			await loadPresets();

			const interval = setInterval(
				() => {
					$$invalidate(18, particles = particles.map(p => ({
						...p,
						x: p.x + p.vx * 0.02,
						y: p.y + p.vy * 0.02,
						vy: p.vy + 0.1,
						life: p.life - 0.02
					})).filter(p => p.life > 0));
				},
				30
			);

			onDestroy(() => clearInterval(interval));
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
		});

		const func = preset => loadPreset(preset.id);
		const toggleSearchTree_handler = () => $$invalidate(12, showSearchTree = !showSearchTree);
		const squareClick_handler = e => handleSquareClick(e.detail.x, e.detail.y);
		const trigger_handler = e => handleEdgeCase(e.detail.type);
		const close_handler = () => $$invalidate(13, showEdgeCases = false);

		$$self.$capture_state = () => ({
			onMount,
			onDestroy,
			tick,
			Board,
			GameControls,
			SearchTree,
			EdgeCases,
			API_BASE,
			board,
			currentPlayer,
			moveCount,
			stateHash,
			history,
			inCheck,
			gameOver,
			evaluation,
			selectedPiece,
			legalMoves,
			lastMove,
			aiThinking,
			aiResult,
			searchTreeData,
			showSearchTree,
			showEdgeCases,
			edgeCaseResult,
			capturedPieces,
			invalidMoveError,
			moveProgress,
			particles,
			flippingPiece,
			gameId,
			presets,
			activePreset,
			fetchGameState,
			loadPreset,
			loadPresets,
			handleSquareClick,
			fetchLegalMoves,
			makeMove,
			showInvalidMoveError,
			createCaptureParticles,
			aiMove,
			resetGame,
			handleEdgeCase,
			currentPlayerName
		});

		$$self.$inject_state = $$props => {
			if ('board' in $$props) $$invalidate(1, board = $$props.board);
			if ('currentPlayer' in $$props) $$invalidate(0, currentPlayer = $$props.currentPlayer);
			if ('moveCount' in $$props) $$invalidate(2, moveCount = $$props.moveCount);
			if ('stateHash' in $$props) stateHash = $$props.stateHash;
			if ('history' in $$props) history = $$props.history;
			if ('inCheck' in $$props) $$invalidate(3, inCheck = $$props.inCheck);
			if ('gameOver' in $$props) $$invalidate(4, gameOver = $$props.gameOver);
			if ('evaluation' in $$props) $$invalidate(5, evaluation = $$props.evaluation);
			if ('selectedPiece' in $$props) $$invalidate(6, selectedPiece = $$props.selectedPiece);
			if ('legalMoves' in $$props) $$invalidate(7, legalMoves = $$props.legalMoves);
			if ('lastMove' in $$props) $$invalidate(8, lastMove = $$props.lastMove);
			if ('aiThinking' in $$props) $$invalidate(9, aiThinking = $$props.aiThinking);
			if ('aiResult' in $$props) $$invalidate(10, aiResult = $$props.aiResult);
			if ('searchTreeData' in $$props) $$invalidate(11, searchTreeData = $$props.searchTreeData);
			if ('showSearchTree' in $$props) $$invalidate(12, showSearchTree = $$props.showSearchTree);
			if ('showEdgeCases' in $$props) $$invalidate(13, showEdgeCases = $$props.showEdgeCases);
			if ('edgeCaseResult' in $$props) $$invalidate(14, edgeCaseResult = $$props.edgeCaseResult);
			if ('capturedPieces' in $$props) $$invalidate(15, capturedPieces = $$props.capturedPieces);
			if ('invalidMoveError' in $$props) $$invalidate(16, invalidMoveError = $$props.invalidMoveError);
			if ('moveProgress' in $$props) $$invalidate(17, moveProgress = $$props.moveProgress);
			if ('particles' in $$props) $$invalidate(18, particles = $$props.particles);
			if ('flippingPiece' in $$props) $$invalidate(19, flippingPiece = $$props.flippingPiece);
			if ('gameId' in $$props) gameId = $$props.gameId;
			if ('presets' in $$props) $$invalidate(20, presets = $$props.presets);
			if ('activePreset' in $$props) $$invalidate(21, activePreset = $$props.activePreset);
			if ('currentPlayerName' in $$props) $$invalidate(22, currentPlayerName = $$props.currentPlayerName);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty[0] & /*currentPlayer*/ 1) {
				$$invalidate(22, currentPlayerName = currentPlayer === 'north' ? '北方 (红方)' : '南方 (蓝方)');
			}
		};

		return [
			currentPlayer,
			board,
			moveCount,
			inCheck,
			gameOver,
			evaluation,
			selectedPiece,
			legalMoves,
			lastMove,
			aiThinking,
			aiResult,
			searchTreeData,
			showSearchTree,
			showEdgeCases,
			edgeCaseResult,
			capturedPieces,
			invalidMoveError,
			moveProgress,
			particles,
			flippingPiece,
			presets,
			activePreset,
			currentPlayerName,
			loadPreset,
			handleSquareClick,
			aiMove,
			resetGame,
			handleEdgeCase,
			func,
			toggleSearchTree_handler,
			squareClick_handler,
			trigger_handler,
			close_handler
		];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}
	}

	const app = new App({
	  target: document.body
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
