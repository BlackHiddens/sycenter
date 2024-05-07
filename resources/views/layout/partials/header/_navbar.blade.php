<!--begin::Navbar-->
<div class="app-navbar flex-lg-grow-1" id="kt_app_header_navbar">
	<div class="app-navbar-item d-flex align-items-center flex-lg-grow-1 me-2 me-lg-0">
		@include(config('settings.KT_THEME_LAYOUT_DIR').'/partials/search/_inline')
	</div>
	<!--begin::Actions-->
	<div class="d-flex align-self-center flex-center flex-shrink-0">
		<a href="#" class="btn btn-sm btn-secondary d-flex flex-center ms-3 px-4 py-3" data-bs-toggle="modal" data-bs-target="#kt_modal_invite_friends">{!! getIcon('plus-square', 'fs-2 text-gray-500') !!}
		<span>Invite</span></a>
		<a href="#" class="btn btn-sm btn-success ms-3 px-4 py-3" data-bs-toggle="modal" data-bs-target="#kt_modal_create_app">Create App</a>
	</div>
	<!--end::Actions-->
	<!--begin::Header menu toggle-->
	<!--end::Header menu toggle-->
</div>
<!--end::Navbar-->
