<!--begin::Navs-->
<div class="app-sidebar-navs flex-column-fluid pb-6" id="kt_app_sidebar_navs">
	<div id="kt_app_sidebar_navs_wrappers" class="hover-scroll-y my-2" data-kt-scroll="true" data-kt-scroll-activate="true" data-kt-scroll-height="auto" data-kt-scroll-dependencies="#kt_app_sidebar_header" data-kt-scroll-wrappers="#kt_app_sidebar_navs" data-kt-scroll-offset="5px">
		@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/sidebar/_navs/_menu')
		@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/sidebar/_navs/_projects')
	</div>
</div>
<!--end::Navs-->
