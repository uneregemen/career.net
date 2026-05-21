package net.career.jobservice.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.util.UUID;

@Entity
@Table(name = "users")
@Immutable
@Getter
@NoArgsConstructor
public class ApplicantUser {

    @Id
    private UUID id;

    @Column(name = "cognito_user_id")
    private String cognitoUserId;

    private String name;
    private String surname;
    private String email;
}
