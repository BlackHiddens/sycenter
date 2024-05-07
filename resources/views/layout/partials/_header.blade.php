<!--begin::Header-->
<div id="kt_app_header" class="app-header" data-kt-sticky="true" data-kt-sticky-activate="{default: true, lg: true}" data-kt-sticky-name="app-header-minimize" data-kt-sticky-offset="{default: '200px', lg: '300px'}" data-kt-sticky-animation="false">
	<!--begin::Header container-->
	<div class="app-container container-fluid d-flex align-items-stretch flex-stack" id="kt_app_header_container">
		<!--begin::Sidebar toggle-->
		<div class="d-flex align-items-center d-block d-lg-none ms-n3" title="Show sidebar menu">
			<div class="btn btn-icon btn-color-gray-600 btn-active-color-primary w-35px h-35px me-1" id="kt_app_sidebar_mobile_toggle">{!! getIcon('abstract-14', 'fs-2') !!}</div>
			<!--begin::Logo image-->
			<a href="#">
				<img alt="Logo" src="{{ image('logos/default-dark.svg') }}" class="h-30px" />
			</a>
			<!--end::Logo image-->
		</div>
		<!--end::Sidebar toggle-->
		@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/header/_navbar')
	</div>
	<!--end::Header container-->
</div>
<!--end::Header-->
