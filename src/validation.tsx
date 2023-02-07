import {setState} from "./state";

const checkValid = ({ element, validators = [] }, errorClass) => {
    return async () => {
        element.setCustomValidity("");
        element.checkValidity();
        let message = element.validationMessage;
        if (message) {
            errorClass && element.classList.toggle(errorClass, true);
            setState('formValidations', errors => ({...errors, [element.name]: message}));
        }
    };
}

export const useForm = ({ errorClass })  => {
    let fields = {};
    const validate = (ref) => {
        let config;
        fields = {};
        fields[ref.name] = config = { element: ref };
        ref.classList.toggle(errorClass, false);
        ref.onblur = checkValid(config, errorClass);
        ref.oninput = () => {

            switch (ref.name) {
                case 'tencent_rtc':
                    const TRTCRegex = /^webrtc:\/\//;
                    if (!TRTCRegex.test(ref.value)) {
                        setState('formValidations', errors => ({...errors, [ref.name]: 'Please provide a valid tencent URL'}));
                        errorClass && ref.classList.toggle(errorClass, true);
                    } else {
                        setState('formValidations', errors => ({...errors, [ref.name]: null}));
                        errorClass && ref.classList.toggle(errorClass, false);
                    }
                    break;
                case 'hls_info':
                    const hlsRegex = /^https?:\/\/.*m3u8.*$/;
                    if (!hlsRegex.test(ref.value)) {
                        setState('formValidations', errors => ({...errors, [ref.name]: 'Please provide a valid HLS URL'}));
                        errorClass && ref.classList.toggle(errorClass, true);
                    } else {
                        setState('formValidations', errors => ({...errors, [ref.name]: null}));
                        errorClass && ref.classList.toggle(errorClass, false);
                    }
                    break;
                default:
                    setState('formValidations', errors => ({...errors, [ref.name]: null}));
                    errorClass && ref.classList.toggle(errorClass, false);
            }
        };
    };

    const formSubmit = (ref, accessor) => {
        const callback = accessor() || (() => {});
        ref.setAttribute("novalidate", "");
        ref.onsubmit = async (e) => {
            e.preventDefault();
            let errored = false;
            for (const k in fields) {
                const field = fields[k];
                await checkValid(field, errorClass)();
                if (!errored && field.element.validationMessage) {
                    field.element.focus();
                    errored = true;
                }
            }
            !errored && callback(ref);
        };
    };

    return { validate, formSubmit };
}
