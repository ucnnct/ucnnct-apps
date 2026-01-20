<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>

    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">

    <div id="kc-form">
      <div id="kc-form-wrapper">
            <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">

                <#if !usernameHidden??>
                    <div class="form-group">
                        <label for="username" class="pf-c-form__label pf-c-form__label-text">
                            <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                        </label>
                        <input tabindex="1" id="username" class="pf-c-form-control" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="off"
                               aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                        <#if messagesPerField.existsError('username','password')>
                            <span id="input-error" class="pf-c-form__helper-text pf-m-error" aria-live="polite">
                                ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                            </span>
                        </#if>
                    </div>
                </#if>

                <div class="form-group">
                    <label for="password" class="pf-c-form__label pf-c-form__label-text">${msg("password")}</label>
                    <input tabindex="2" id="password" class="pf-c-form-control" name="password" type="password" autocomplete="off"
                           aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                </div>

                <div class="form-group login-pf-settings">
                    <div id="kc-form-options">
                        <#if realm.rememberMe && !usernameHidden??>
                            <div class="checkbox">
                                <label>
                                    <#if login.rememberMe??>
                                        <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                                    <#else>
                                        <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                                    </#if>
                                </label>
                            </div>
                        </#if>
                    </div>
                    <div class="kc-forgot-pw">
                        <#if realm.resetPasswordAllowed>
                            <span><a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a></span>
                        </#if>
                    </div>
                </div>

                <div id="kc-form-buttons" class="form-group">
                    <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                    <input tabindex="4" class="pf-c-button pf-m-primary pf-m-block btn-lg" name="login" id="kc-login" type="submit" value="${msg("doLogIn")}"/>
                </div>
            </form>
        </div>

        <#if realm.password && social.providers??>
            <div id="kc-social-providers" class="form-group">
                <hr />
                <ul class="kc-social-links">
                    <#list social.providers as p>
                        <li>
                            <a id="social-${p.alias}" class="kc-social-link zocial ${p.providerId}" href="${p.loginUrl}">
                                <span class="kc-social-provider-name">${p.displayName!}</span>
                            </a>
                        </li>
                    </#list>
                </ul>
            </div>
        </#if>
    </div>

    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration-container">
                <div id="kc-registration">
                    <span>${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
                </div>
            </div>
        </#if>
    </#if>

</@layout.registrationLayout>
