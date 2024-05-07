<x-auth-layout>

    <!--begin::Form-->
    <form class="form w-100" novalidate="novalidate" id="kt_sign_in_form" data-kt-redirect-url="{{ route('dashboard') }}" action="{{ route('login') }}">
        @csrf
        <!--begin::Heading-->
        <div class="text-center mb-10">
            <!--begin::Title-->
            <h1 class="text-gray-900 mb-3">Sign In to Open HTML Pro</h1>
            <!--end::Title-->
            <!--begin::Link-->
            <div class="text-gray-500 fw-semibold fs-4">New Here?
                <a href="/register" class="link-primary fw-bold">Create an Account</a></div>
            <!--end::Link-->
        </div>
        <!--begin::Heading-->
        <!--begin::Input group-->
        <div class="fv-row mb-10 fv-plugins-icon-container">
            <!--begin::Label-->
            <label class="form-label fs-6 fw-bold text-gray-900">Email</label>
            <!--end::Label-->
            <!--begin::Input-->
            <input class="form-control form-control-lg form-control-solid" type="text" name="email" autocomplete="off" value="demo@demo.com">
            <!--end::Input-->
            <div class="fv-plugins-message-container invalid-feedback"></div></div>
        <!--end::Input group-->
        <!--begin::Input group-->
        <div class="fv-row mb-10 fv-plugins-icon-container">
            <!--begin::Wrapper-->
            <div class="d-flex flex-stack mb-2">
                <!--begin::Label-->
                <label class="form-label fw-bold text-gray-900 fs-6 mb-0">Password</label>
                <!--end::Label-->
                <!--begin::Link-->
                <a href="{{ route('password.request') }}" class="link-primary fs-6 fw-bold">Forgot Password ?</a>
                <!--end::Link-->
            </div>
            <!--end::Wrapper-->
            <!--begin::Input-->
            <input class="form-control form-control-lg form-control-solid" type="password" name="password" autocomplete="off" value="demo">
            <!--end::Input-->
            <div class="fv-plugins-message-container invalid-feedback"></div></div>
        <!--end::Input group-->
        <!--begin::Actions-->
        <div class="text-center">
            <!--begin::Submit button-->
            <button type="submit" id="kt_sign_in_submit" class="btn btn-lg btn-primary w-100 mb-5">
                @include('partials/general/_button-indicator', ['label' => 'Sign In'])
            </button>
            <!--end::Submit button-->
            <!--begin::Separator-->
            <div class="text-center text-muted text-uppercase fw-bold mb-5">or</div>
            <!--end::Separator-->
            <!--begin::Google link-->
            <a href="#" class="btn btn-flex flex-center btn-light btn-lg w-100 mb-5">
                <img alt="Logo" src="{{ image('svg/brand-logos/google-icon.svg') }}" class="h-20px me-3">Continue with Google</a>
            <!--end::Google link-->
            <!--begin::Google link-->
            <a href="#" class="btn btn-flex flex-center btn-light btn-lg w-100 mb-5">
                <img alt="Logo" src="{{ image('svg/brand-logos/facebook-4.svg') }}" class="h-20px me-3">Continue with Facebook</a>
            <!--end::Google link-->
            <!--begin::Google link-->
            <a href="#" class="btn btn-flex flex-center btn-light btn-lg w-100">
                <img alt="Logo" src="{{ image('svg/brand-logos/apple-black.svg') }}" class="theme-light-show h-20px me-3">
                <img alt="Logo" src="{{ image('svg/brand-logos/apple-black-dark.svg') }}" class="theme-dark-show h-20px me-3">Continue with Apple</a>
            <!--end::Google link-->
        </div>
        <!--end::Actions-->
    </form>
    <!--end::Form-->

</x-auth-layout>
