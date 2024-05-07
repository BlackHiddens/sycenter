<!--begin::Header-->
<div class="app-sidebar-header flex-column mx-10 pt-8" id="kt_app_sidebar_header">
	<!--begin::Brand-->
	<div class="d-flex flex-stack d-none d-lg-flex mb-13">
		<!--begin::Logo-->
		<a href="#" class="app-sidebar-logo">
			<img alt="Logo" src="{{ image('logos/default.svg') }}" class="h-30px app-sidebar-logo-default" />
		</a>
		<!--end::Logo-->
		<!--begin::Chat-->
		<div class="d-flex align-items-center">
			<!--begin::Menu wrapper-->
			<div class="btn btn-icon w-15px h-15px w-lg-20px h-lg-20px btn-color-success position-relative" data-kt-menu-trigger="{default: 'click', lg: 'hover'}" data-kt-menu-attach="parent" data-kt-menu-placement="bottom-start">
				<i class="fonticon-stats fs-2"></i>
				<span class="bullet bullet-dot bg-success h-6px w-6px position-absolute translate-middle ms-7 mb-3 animation-blink"></span>
				@include('partials/menus/_notifications-menu')
			</div>
			<!--end::Menu wrapper-->
		</div>
		<!--end::Chat-->
	</div>
	<!--end::Brand-->
	<!--begin::User-->
	<div class="d-flex btn btn-outline btn-custom align-items-center w-200 mb-2" data-kt-menu-trigger="{default: 'click', lg: 'hover'}" data-kt-menu-attach="parent" data-kt-menu-placement="bottom-start">
	<!--begin::User-->
	<div class="cursor-pointer symbol symbol-35px symbol-lg-40px me-3 ms-n2">
		<img class="" src="{{ image('avatars/300-3.jpg') }}" alt="user" />
	</div>
	<!--end::User-->
	<!--begin:Info-->
	<div class="d-flex flex-column align-items-start flex-grow-1">
		<a href="#" class="btn-title fs-6 fw-bold">Johnson</a>
		<a href="#" class="btn-desc fs-7 fw-bold d-block">React Developer</a>
	</div>
	<!--end:Info-->{!! getIcon('icons/duotune/general/gen033.svg', ' btn-icon fs-2 me-n2') !!}</div>
	@include('partials/menus/_user-account-menu')
	<!--end::User-->
</div>
<!--end::Header-->
