<!--begin::Search-->
<div id="kt_header_search" class="header-search d-flex align-items-center w-lg-350px" data-kt-search-keypress="true" data-kt-search-min-length="2" data-kt-search-enter="enter" data-kt-search-layout="menu" data-kt-search-responsive="true" data-kt-menu-trigger="auto" data-kt-menu-permanent="true" data-kt-menu-placement="bottom-end">
	<!--begin::Tablet and mobile search toggle-->
	<div data-kt-search-element="toggle" class="search-toggle-mobile d-flex d-lg-none align-items-center">
		<div class="d-flex">{!! getIcon('magnifier', 'fs-1 ') !!}</div>
	</div>
	<!--end::Tablet and mobile search toggle-->
	@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/search/partials/_form-inline')
	<!--begin::Menu-->
	<div data-kt-search-element="content" class="menu menu-sub menu-sub-dropdown w-300px w-md-350px py-7 px-7 overflow-hidden">
		<!--begin::Wrapper-->
		<div data-kt-search-element="wrapper">
			@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/search/partials/_results')
			@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/search/partials/_main')
			@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/search/partials/_empty')
		</div>
		<!--end::Wrapper-->
		@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/search/partials/_advanced-options')
		@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/search/partials/_preferences')
	</div>
	<!--end::Menu-->
</div>
<!--end::Search-->
