<x-system-layout>

    <!--begin::Content-->
    <div class="d-flex flex-row-fluid flex-column flex-column-fluid text-center p-10 py-lg-20">
        <!--begin::Logo-->
        <a href="{{ route('dashboard') }}" class="pt-lg-20 mb-12">
            <img alt="Logo" src="{{ image('logos/default-dark.svg') }}" class="theme-light-show h-40px h-lg-50px">
            <img alt="Logo" src="{{ image('logos/default.svg') }}" class="theme-dark-show h-40px h-lg-50px">
        </a>
        <!--end::Logo-->
        <!--begin::Logo-->
        <h1 class="fw-bold fs-2qx text-gray-800 mb-10">System Error</h1>
        <!--end::Logo-->
        <!--begin::Message-->
        <div class="fw-semibold fs-3 text-muted mb-15">Something went wrong!
            <br>Please try again later.
        </div>
        <!--end::Message-->
        <!--begin::Action-->
        <div class="text-center">
            <a href="{{ route('dashboard') }}" class="btn btn-lg btn-primary fw-bold">Go to homepage</a>
        </div>
        <!--end::Action-->
    </div>
    <!--end::Content-->
    <!--begin::Illustration-->
    <div class="d-flex flex-row-auto bgi-no-repeat bgi-position-x-center bgi-size-contain bgi-position-y-bottom min-h-150px min-h-lg-350px" style="background-image: url('{{ image('illustrations/dozzy-1/7.png') }}')"></div>
    <!--end::Illustration-->

</x-system-layout>
