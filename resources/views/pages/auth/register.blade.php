<x-auth-layout>

    <!--begin::Form-->
    <form class="form w-100" novalidate="novalidate" id="kt_sign_up_form" data-kt-redirect-url="{{ route('login') }}" action="{{ route('register') }}">
        @csrf
        <!--begin::Heading-->
        <div class="mb-10 text-center">
            <!--begin::Title-->
            <h1 class="text-gray-900 mb-3">Create an Account</h1>
            <!--end::Title-->
            <!--begin::Link-->
            <div class="text-gray-500 fw-semibold fs-4">Already have an account?
                <a href="/login" class="link-primary fw-bold">Sign in here</a></div>
            <!--end::Link-->
        </div>
        <!--end::Heading-->
        <!--begin::Action-->
        <button type="button" class="btn btn-light-primary fw-bold w-100 mb-10">
            <img alt="Logo" src="{{ image('svg/brand-logos/google-icon.svg') }}" class="h-20px me-3">Sign in with Google</button>
        <!--end::Action-->
        <!--begin::Separator-->
        <div class="d-flex align-items-center mb-10">
            <div class="border-bottom border-gray-300 mw-50 w-100"></div>
            <span class="fw-semibold text-gray-500 fs-7 mx-2">OR</span>
            <div class="border-bottom border-gray-300 mw-50 w-100"></div>
        </div>
        <!--end::Separator-->
        <!--begin::Input group-->
        <div class="row fv-row mb-7 fv-plugins-icon-container">
            <!--begin::Col-->
            <div class="col-xl-6">
                <label class="form-label fw-bold text-gray-900 fs-6">First Name</label>
                <input class="form-control form-control-lg form-control-solid" type="text" placeholder="" name="first-name" autocomplete="off">
                <div class="fv-plugins-message-container invalid-feedback"></div></div>
            <!--end::Col-->
            <!--begin::Col-->
            <div class="col-xl-6">
                <label class="form-label fw-bold text-gray-900 fs-6">Last Name</label>
                <input class="form-control form-control-lg form-control-solid" type="text" placeholder="" name="last-name" autocomplete="off">
                <div class="fv-plugins-message-container invalid-feedback"></div></div>
            <!--end::Col-->
        </div>
        <!--end::Input group-->
        <!--begin::Input group-->
        <div class="fv-row mb-7 fv-plugins-icon-container">
            <label class="form-label fw-bold text-gray-900 fs-6">Email</label>
            <input class="form-control form-control-lg form-control-solid" type="email" placeholder="" name="email" autocomplete="off">
            <div class="fv-plugins-message-container invalid-feedback"></div></div>
        <!--end::Input group-->
        <!--begin::Input group-->
        <div class="mb-10 fv-row fv-plugins-icon-container" data-kt-password-meter="true">
            <!--begin::Wrapper-->
            <div class="mb-1">
                <!--begin::Label-->
                <label class="form-label fw-bold text-gray-900 fs-6">Password</label>
                <!--end::Label-->
                <!--begin::Input wrapper-->
                <div class="position-relative mb-3">
                    <input class="form-control form-control-lg form-control-solid" type="password" placeholder="" name="password" autocomplete="off">
                    <span class="btn btn-sm btn-icon position-absolute translate-middle top-50 end-0 me-n2" data-kt-password-meter-control="visibility">
                        <i class="ki-duotone ki-eye-slash fs-2"></i>
                        <i class="ki-duotone ki-eye fs-2 d-none"></i>
                    </span>
                </div>
                <!--end::Input wrapper-->
                <!--begin::Meter-->
                <div class="d-flex align-items-center mb-3" data-kt-password-meter-control="highlight">
                    <div class="flex-grow-1 bg-secondary bg-active-success rounded h-5px me-2"></div>
                    <div class="flex-grow-1 bg-secondary bg-active-success rounded h-5px me-2"></div>
                    <div class="flex-grow-1 bg-secondary bg-active-success rounded h-5px me-2"></div>
                    <div class="flex-grow-1 bg-secondary bg-active-success rounded h-5px"></div>
                </div>
                <!--end::Meter-->
            </div>
            <!--end::Wrapper-->
            <!--begin::Hint-->
            <div class="text-muted">Use 8 or more characters with a mix of letters, numbers &amp; symbols.</div>
            <!--end::Hint-->
            <div class="fv-plugins-message-container invalid-feedback"></div></div>
        <!--end::Input group=-->
        <!--begin::Input group-->
        <div class="fv-row mb-5 fv-plugins-icon-container">
            <label class="form-label fw-bold text-gray-900 fs-6">Confirm Password</label>
            <input class="form-control form-control-lg form-control-solid" type="password" placeholder="" name="confirm-password" autocomplete="off">
            <div class="fv-plugins-message-container invalid-feedback"></div></div>
        <!--end::Input group-->
        <!--begin::Input group-->
        <div class="fv-row mb-10 fv-plugins-icon-container">
            <label class="form-check form-check-custom form-check-solid form-check-inline">
                <input class="form-check-input" type="checkbox" name="toc" value="1">
                <span class="form-check-label fw-semibold text-gray-700 fs-6">I Agree
                    <a href="#" class="ms-1 link-primary">Terms and conditions</a>.</span>
            </label>
            <div class="fv-plugins-message-container invalid-feedback"></div></div>
        <!--end::Input group-->
        <!--begin::Actions-->
        <div class="text-center">
            <button type="button" id="kt_sign_up_submit" class="btn btn-lg btn-primary">
                @include('partials/general/_button-indicator', ['label' => 'Sign Up'])
            </button>
        </div>
        <!--end::Actions-->
    </form>
    <!--end::Form-->

</x-auth-layout>
